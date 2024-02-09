function identify() {
  sendRequest(site + "/api/auth.test").then(text => {
    const response = JSON.parse(text)
    setIdentifier(`${response.user}, ${response.team}`)
  })
  .catch(processError)
}

function load() {
  loadAsync()
    .then(processResults)
    .catch(processError)
}

async function loadAsync() {
  const channelIds = await getChannelIds()
  const messages = await getMessageInChannels(channelIds)
  return messages.filter(e => e.type === "message").map(message => {
    const date = new Date(parseInt(message.ts) * 1000)
    const body = makeMessageFromBlocks(message.blocks) || message.text
    const post = Post.createWithUriDateContent(message.permalink, date, body)
    const host = message.permalink.split("/")[2]
    const creatorURI = `https://${host}/team/${message.user_id}`
    const creator = Creator.createWithUriName(creatorURI, message.user.display_name)
    creator.avatar = message.user.image_original
    post.creator = creator
    if (message.files) {
      post.attachments = message.files.slice(0, 4).map(file => {
        const attachment = Attachment.createWithMedia(file.url_private)
        attachment.text = file.title
        attachment.thumbnail = file.thumb_360
        return attachment
      })
    }
    return post
  })
}

async function getChannelIds() {
  const channelNames = channels
    .split(/,| /)
    .map(e => e.replace(/^#/, "").trim().toLowerCase())
  const text = await sendRequest(`${site}/api/conversations.list`)
  const obj = JSON.parse(text)
  return obj.channels
    .filter(e => channelNames.includes(e.name))
    .map(e => e.id)
}

async function getMessageInChannels(channelIds) {
  return (await Promise.all(channelIds.map(getMessageInChannel)))
    .flat()
    .sort((a, b) => a.ts < b.ts)
}

async function getMessageInChannel(channelId) {
  const text = await sendRequest(
    `${site}/api/conversations.history?channel=${channelId}&limit=20&include_all_metadata=1`
  )
  const obj = JSON.parse(text)
  return await Promise.all(obj.messages.map(message => {
    return Promise.all([
      getPermalink(channelId, message.ts),
      getUser(message.user),
    ]).then(values => {
      return {
        ...message,
        permalink: values[0],
        user_id: message.user,
        user: values[1]
      }
    })
  }))
}

async function getPermalink(channelId, ts) {
  const url = `${site}/api/chat.getPermalink?channel=${channelId}&message_ts=${ts}`
  const text = await sendRequest(url)
  const obj = JSON.parse(text)
  return obj.permalink
}

async function getUser(user) {
  const url = `${site}/api/users.profile.get?user=${user}`
  const text = await sendRequest(url)
  const obj = JSON.parse(text)
  return obj.profile
}

function makeMessageFromBlocks(blocks) {
  if (!blocks || blocks.length == 0 || blocks[0].type != "rich_text") {
    return null
  } 
  const block = blocks[0]
  if (!block.elements || block.elements.length == 0 || block.elements[0].type != "rich_text_section") {
    return null
  }
  const element = block.elements[0]
  if (!element.elements) {
    return null
  }
  var text = ""
  for (const childElement of element.elements) {
    if (childElement.type == "text") {
      text += childElement.text
    } else if (childElement.type == "link") {
      text += childElement.text
    } else if (childElement.type == "emoji" && childElement.unicode) {
      text += String.fromCodePoint(parseInt(childElement.unicode, 16))
    }
  }
  return text
}

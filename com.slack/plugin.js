function verify() {
  sendRequest(site + "/api/auth.test").then(text => {
    const response = JSON.parse(text)
    processVerification({ displayName: response.team })
  })
  .catch(processError)
}

function load() {
  loadAsync()
    .then(processResults)
    .catch(processError)
}

async function loadAsync() {
  const channelIds = await getConfiguredChannelIds()
  const messages = await getMessageInChannels(channelIds)
  return await Promise.all(
    messages
      .filter(e => e.type === "message" && e.subtype === undefined)
      .map(async message => {
        const date = new Date(parseInt(message.ts) * 1000)
        const body = await stringFromBlocks(message.blocks)
        const post = Item.createWithUriDate(message.permalink, date)
        post.body = body
        const host = message.permalink.split("/")[2]
        const creatorURI = `https://${host}/team/${message.user_id}`
        const creator = Identity.createWithName(message.user.display_name)
        creator.uri = creatorURI
        creator.avatar = message.user.image_192
        post.creator = creator
        if (message.files) {
          post.attachments = message.files.slice(0, 4).map(file => {
            const attachment = MediaAttachment.createWithUrl(file.url_private_download)
            attachment.text = file.title
            return attachment
          })
        }
        return post
      }) 
  )
}

/**
 * Fetch data
 */
 
let cachedTeam = null
let cachedUserProfiles = {}
let cachedChannels = {}

async function getConfiguredChannelIds() {
  const channelNames = channels
    .split(/,| /)
    .map(e => e.replace(/^#/, "").trim().toLowerCase())
  const theChannels = await getChannels()
  return theChannels
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
      getUserProfile(message.user),
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

async function getUserProfile(userId) {
  if (cachedUserProfiles[userId]) {
    return cachedUserProfiles[userId]
  }
  const url = `${site}/api/users.profile.get?user=${userId}`
  const text = await sendRequest(url)
  const obj = JSON.parse(text)
  cachedUserProfiles[userId] = obj.profile
  return obj.profile
}

async function getTeamInfo() {
  if (cachedTeam) {
    return cachedTeam
  }
  const url = `${site}/api/team.info`
  const text = await sendRequest(url)
  const obj = JSON.parse(text)
  cachedTeam = obj.team
  return obj.team
}

async function getChannels() {
  const text = await sendRequest(`${site}/api/conversations.list`)
  const obj = JSON.parse(text)
  if (obj.channels) {
    for (const channel of obj.channels) {
      cachedChannels[channel.id] = channel
    }
  }
  return obj.channels
}

async function getChannel(channelId) {
  if (cachedChannels[channelId]) {
    return cachedChannels[channelId]
  }
  const url = `${site}/api/conversations.info`
  const text = await sendRequest(url)
  const obj = JSON.parse(text)
  cachedChannels[channelId] = obj.channel
  return obj.channel
}

/**
 * Construct messages
 */

async function stringFromBlocks(blocks) {
  if (!blocks) {
    return ""
  }
  const texts = await Promise.all(
    blocks.map(async block => {
      if (block.type == "rich_text") {
        return await stringFromRichTextBlock(block)
      } else {
        console.log(`Ignored block type: ${block.type}"`)
        return ""
      }
    })
  )
  return texts.join("").replace(/\n/g, "<br/>")
}

async function stringFromRichTextBlock(block) {
  const texts = await Promise.all(
    block.elements.map(async element => {
      if (element.type == "rich_text_section") {
        return `<p>${await stringFromTextElements(element.elements)}</p>`
      } else if (element.type == "rich_text_list") {
        const items = await Promise.all(
          element.elements.map(section => {
            return stringFromTextElements(section.elements)
          })
        )
        if (element.style == "ordered") {
          return `<p>${items.map((e, idx) => `${idx + 1}. ${e}`).join("\n")}</p>`
        } else {
          return `<p>${items.map(e => `• ${e}`).join("\n")}</p>`
        }
      } else if (element.type == "rich_text_preformatted") {
        const text = await stringFromTextElements(element.elements)
        return `<p><code>${text}</code></p>`
      } else if (element.type == "rich_text_quote") {
        return `<p>${await stringFromTextElements(element.elements)}</p>`
      } else {
        console.log(`Ignored element type: ${element.type}`)
        return ""
      }
    })
  )
  return texts.join("")
}

async function stringFromTextElements(elements) {
  const texts = await Promise.all(elements.map(stringFromTextElement))
  return texts.join("")
}

async function stringFromTextElement(element) {
  if (element.type == "text") {
    if (element.style && element.style.bold) {
      return `<strong>${element.text}</strong>`
    } else if (element.style && element.style.italic) {
      return `<em>${element.text}</em>`
    } else if (element.style && element.style.code) {
      return `<code>${element.text}</code>`
    } else {
      return element.text
    }
  } else if (element.type == "emoji") {
    if (element.unicode) {
      return String.fromCodePoint(parseInt(element.unicode, 16))
    } else {
      return ""
    }
  } else if (element.type == "link") {
    return `<a href="${element.url}">${element.url}</a>`
  } else if (element.type == "user") {
    const team = await getTeamInfo()
    const user = await getUserProfile(element.user_id)
    const userName = [user.display_name, user.real_name, element.user_id]
      .filter(e => e != null && e.length > 0)[0]
    return `<a href="${team.url}/team/${element.user_id}">@${userName}</a>`
  } else if (element.type == "channel") {
    const team = await getTeamInfo()
    const channel = await getChannel(element.channel_id)
    return `<a href="${team.url}/archives/${element.channel_id}">@${channel.name}</a>`
  } else {
    console.log(`Ignored element type: ${element.type}`)
    return ""
  }
}

function identify() {
  setIdentifier(null)
}

function load() {
  loadAsync()
    .then(processResults)
    .catch(processError)
}

async function loadAsync() {
  const text = await sendRequest("https://apple.com/newsroom/rss-feed.rss")
  const obj = xmlParse(text)
  return obj.feed.entry.map(entry => {
    const date = new Date(entry.updated)
    const content = `${entry.title}<br/><br/>${entry.content}`
    const authorLink = obj.feed.id
    const postLink = entry.id
    const creator = Creator.createWithUriName(authorLink, entry.author.name)
    creator.avatar = "https://www.apple.com/newsroom/images/default/apple-logo-og.jpg"
    const post = Post.createWithUriDateContent(postLink, date, content)
    post.creator = creator
    const imageLink = findImageLink(entry)
    if (imageLink) {
      const attachment = Attachment.createWithMedia(imageLink.href)
      attachment.text = imageLink.title
      post.attachments = [attachment]
    }
    return post
  })
}

function findImageLink(entry) {
  if (!entry["link$attrs"]) {
    return null
  }
  return entry["link$attrs"].find(e => e.type === "image/jpeg")
}

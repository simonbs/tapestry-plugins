function identify() {
  setIdentifier(null)
}

function load() {
  loadAsync()
    .then(processResults)
    .catch(processError)
}

async function loadAsync() {
  const bearer = await getBearer()
  if (!bearer) {
    return []
  }
  console.log(bearer)
  const stories = await getStoriesToday(bearer, countryCode, language)
  return stories.filter(story => story.date).map(story => {
    let body = `<p>${story.title}</p>`
    if (story.subtitle) {
      body += `<p>${story.subtitle}</p>`
    }
    const post = Post.createWithUriDateContent(story.url, story.date, body)
    const creator = Creator.createWithUriName("https://www.apple.com/app-store/", "App Store Editorial")
    creator.avatar = "https://www.apple.com/v/app-store/b/images/overview/icon_appstore__ev0z770zyxoy_large_2x.png"
    post.creator = creator
    let attachments = []
    if (story.video) {
      attachments.push(Attachment.createWithMedia(story.video))
    } else if (story.image) {
      attachments.push(Attachment.createWithMedia(story.image))
    }
    post.attachments = attachments
    return post
  })
}

async function getBearer() {
  const html = await sendRequest(`https://www.apple.com/app-store/`)
  const regex = /<meta property="apple-app-token" content="([A-Za-z0-9.-]+)"\/>/g
  const matches = regex.exec(html)
  if (matches.length < 2) {
    return null
  }
  return matches[1]
}

async function getStoriesToday(bearer, storefront, language) {
  const url = `https://amp-api.apps.apple.com/v1/editorial/${storefront}/today`
    + `?l=${language}`
    + "&platform=iphone"
    + "&additionalPlatforms=ipad"
    + "&sparseLimit=42"
  const text = await sendRequest(url, "GET", null, {
    "Origin": "https://www.apple.com",
    "Authorization": `Bearer ${bearer}`
  })
  const json = JSON.parse(text)
  if (json.errors && json.errors.length > 0) {
    const error = json.errors[0]
    if (error.title && error.detail) {
      throw new Error(`${error.title}: ${error.detail}`)
    } else if (error.title) {
      throw new Error(error.title)
    } else {
      throw new Error("Unknown error occurred")
    }
  }
  return json.results.data.flatMap(day => {
    return day.contents.map(item => {
      const image = getImage(item)
      const video = getVideo(item)
      let mappedItem = {
        id: item.id,
        href: `https://amp-api.apps.apple.com${item.href}`,
        url: item.attributes.url,
        date: new Date(day.date),
        title: item.attributes.editorialNotes.name,
        kind: item.attributes.kind,
        label: item.attributes.label
      }
      if (item.attributes.editorialNotes.short) {
        mappedItem.subtitle = item.attributes.editorialNotes.short
      }
      if (image) {
        mappedItem.image = image
      }
      if (video) {
        mappedItem.video = video
      }
      return mappedItem
    })
  })
}

function getImage(item) {
  if (!item.attributes || !item.attributes.editorialArtwork) {
    return null
  }
  const editorialArtwork = item.attributes.editorialArtwork
  let url = null
  if (editorialArtwork.generalCard) {
    url = editorialArtwork.generalCard.url
  } else if (editorialArtwork.dayCard) {
    url = editorialArtwork.dayCard.url
  } else if (editorialArtwork.storyCenteredStatic16x9) {
    url = editorialArtwork.storyCenteredStatic16x9.url
  }
  if (!url) {
    return null
  }
  return url
    .replace("{w}", "960")
    .replace("{h}", "1266")
    .replace("{c}", "fn")
    .replace("{f}", "png")
}

function getVideo(item) {
  if (!item.attributes || !item.attributes.editorialVideo) {
    return null
  }
  const editorialVideo = item.attributes.editorialVideo
  if (!editorialVideo.storeFrontVideo) {
    return null
  }
  return editorialVideo.storeFrontVideo.video
}

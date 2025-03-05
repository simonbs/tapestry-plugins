function verify() {
  getBearer().then(bearer => {
    return validateStorefrontAndLanguage(bearer, varStorefront, varLanguage)
  }).then(result => {
    if (result.success) {
      processVerification()
    } else {
      processError(result.error)
    }
  })
  .catch(processError)
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
  const { success, error, storefront, language } = await validateStorefrontAndLanguage(
    bearer, varStorefront, varLanguage
  )
  if (!success) {
    throw new Error(error)
  }
  let i = 0
  const stories = await getStoriesToday(bearer, storefront, language)
  return stories
    .filter(story => story.date)
    .map(e => {
      // Stabilize order.
      const date = new Date(e.date.getTime() + i * 1000)
      i += 1
      return {...e, date } 
    })
    .map(story => {
      const item = Item.createWithUriDate(story.url, story.date)
      item.title = story.title
      if (story.subtitle) {
        item.body = story.subtitle
      }
      const creator = Identity.createWithName("App Store Editorial")
      creator.uri = "https://apple.com/app-store/"
      creator.avatar = "https://apple.com/v/app-store/b/images/overview/icon_appstore__ev0z770zyxoy_large_2x.png"
      item.creator = creator
      let attachment = null
      if (story.video) {
        attachment = MediaAttachment.createWithUrl(story.video)
      } else if (story.image) {
        attachment = MediaAttachment.createWithUrl(story.image)
      }
      if (attachment) {
        attachment.aspectSize = {width: 353, height: 435}
        attachment.focalPoint = {x: 0, y: 0}
        item.attachments = [attachment]
      }
      return item
    })
}

async function getBearer() {
  const html = await sendRequest(`https://apple.com/app-store/`)
  const regex = /<meta property="apple-app-token" content="([A-Za-z0-9.\-_]+)"\/>/g
  const matches = regex.exec(html)
  if (!matches || matches.length < 2) {
    return null
  }
  return matches[1]
}

async function validateStorefrontAndLanguage(bearer, storefront, language) {
  const storefronts = await getStorefronts(bearer)
  const storefrontMatch = storefronts.find(e => {
    return e.attributes.name.toLowerCase() == storefront.toLowerCase()
  })
  if (!storefrontMatch) {
    const error = `Storefront not supported: ${storefront}`
    return { success: false, error }
  }
  const defaultLanguage = storefrontMatch.attributes.defaultLanguageTag
  if (!language || language.length == 0) {
    return {
      success: true,
      storefront: storefrontMatch.id,
      storefrontDisplayName: storefrontMatch.attributes.name,
      language: defaultLanguage
    }
  }
  const supportedLanguages = storefrontMatch.attributes.supportedLanguageTags
  const languageMatch = supportedLanguages.find(e => {
    return e.toLowerCase() == language.toLowerCase()
  })
  if (!languageMatch) {
    const error = `${language} not supported for ${storefrontMatch.attributes.name} storefront. `
    + `Supported languages: ${supportedLanguages.join(", ")}`
    return { success: false, error }
  }
  return {
    success: true,
    storefrontDisplayName: storefrontMatch.attributes.name,
    storefront: storefrontMatch.id,
    language: languageMatch
  }
}

async function getStoriesToday(bearer, storefront, language) {
  const url = `https://amp-api.apps.apple.com/v1/editorial/${storefront}/today`
    + `?l=${language}`
    + "&platform=iphone"
    + "&additionalPlatforms=ipad"
    + "&sparseLimit=42"
  const text = await sendRequest(url, "GET", null, {
    "Origin": "https://apple.com",
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
    if (!day.contents) {
      return []
    }
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

async function getStorefronts(bearer) {
  const url = "https://amp-api.apps.apple.com/v1/storefronts"
  + "?platform=iphone"
  + "&additionalPlatforms=ipad,appletv,mac,watch"
  const text = await sendRequest(url, "GET", null, {
    "Origin": "https://apple.com",
    "Authorization": `Bearer ${bearer}`
  })
  const obj = JSON.parse(text)
  return obj.data
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

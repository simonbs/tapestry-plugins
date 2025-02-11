function getVideoCount() {
  const n = parseInt(varVideoCount)
  if (!isNaN(n)) {
    return n
  } else {
    return 10
  }
}

function verify() {
  sendRequest(
    "https://www.googleapis.com/youtube/v3/channels"
    + "?part=snippet"
    + "&mine=true"
  ).then(_text => {
    processVerification({ displayName: "YouTube" })
  })
  .catch(processError)
}

function load() {
  loadAsync()
    .then(processResults)
    .catch(processError)
}

async function loadAsync() {
  const channels = await getSubscribedChannels()
  const videos = await getVideosInChannels(channels)
  return videos.slice(0, getVideoCount()).map(video => {
    const author = Identity.createWithName(video.channel.title)
    author.uri = video.channel.permalink
    author.avatar = video.channel.thumbnail
    const attachment = MediaAttachment.createWithUrl(video.image)
    attachment.thumbnail = video.thumbnail
    const post = Item.createWithUriDate(video.permalink, video.publishedAt)
    post.title = video.title
    if (video.description && video.description.length > 0) {
      post.body = video.description.replace(/\n/g, "<br/>")
    } 
    post.author = author
    post.attachments = [attachment]
    return post
  })
}

async function getSubscribedChannels(nextPageToken) {
  let url = "https://www.googleapis.com/youtube/v3/subscriptions"
    + "?part=snippet"
    + "&mine=true"
    + "&maxResults=50"
  if (nextPageToken) {
    url += `&pageToken=${nextPageToken}`
  }
  const text = await sendRequest(url)
  const obj = JSON.parse(text)
  const items = obj.items.filter(item => {
    return item.snippet.resourceId.kind === "youtube#channel"
  }).map(item => {
    return {
      id: item.snippet.resourceId.channelId,
      title: item.snippet.title,
      thumbnail: getHighResolutionThumbnail(item.snippet.thumbnails),
      permalink: `https://www.youtube.com/channel/${item.snippet.resourceId.channelId}`
    }
  })
  if (obj.nextPageToken) {
    return items.concat(await getSubscribedChannels(obj.nextPageToken))
  } else {
    return items
  }
}

async function getVideosInChannels(channels) {
  const unflatted = await Promise.all(
    channels.map(async channel => {
      const videos = await getVideosInChannelWithId(channel.id)
      return videos.map(video => {
        return { ...video, channel }
      })
    })
  )
  return unflatted.flat().sort((a, b) => a.publishedAt < b.publishedAt)
}

async function getVideosInChannelWithId(channelId) {
  // HACK: The ID of the playlist containing a channel's uploads can be
  // constructed from the channel ID. This isn't really a good idea but
  // it saves us from doing an API call for each channel, and as such,
  // reduces the impact each of Tapestry's loads has on our API quota.
  const playlistId = channelId.replace(/^UC/g, "UU")
  const text = await sendRequest(
    `https://www.googleapis.com/youtube/v3/playlistItems`
    + `?part=snippet`
    + `&playlistId=${playlistId}`
  )
  const obj = JSON.parse(text)
  return obj.items.filter(item => {
    return item.snippet.resourceId.kind === "youtube#video"
  }).map(item => {
    return {
      title: item.snippet.title,
      description: item.snippet.description,
      image: getHighResolutionThumbnail(item.snippet.thumbnails),
      thumbnail: getLowResolutionThumbnail(item.snippet.thumbnails),
      publishedAt: new Date(item.snippet.publishedAt),
      permalink: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
    }
  })
}

function getHighResolutionThumbnail(thumbnails) {
  if (thumbnails.maxres) {
    return thumbnails.maxres.url
  } else if (thumbnails.standard) {
    return thumbnails.standard.url
  } else if (thumbnails.high) {
    return thumbnails.high.url
  } else if (thumbnails.medium) {
    return thumbnails.medium.url
  } else if (thumbnails.default) {
    return thumbnails.default.url
  } else {
    return null
  }
}

function getLowResolutionThumbnail(thumbnails) {
  if (thumbnails.standard) {
    return thumbnails.standard.url
  } else if (thumbnails.high) {
    return thumbnails.high.url
  } else if (thumbnails.medium) {
    return thumbnails.medium.url
  } else if (thumbnails.default) {
    return thumbnails.default.url
  } else if (thumbnails.maxres) {
    return thumbnails.maxres.url
  } else {
    return null
  }
}

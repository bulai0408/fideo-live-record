import debug from 'debug'

import { DESKTOP_USER_AGENT, request } from '../base-request.js'
import { captureError } from '../capture-error.js'

import { SUCCESS_CODE, CRAWLER_ERROR_CODE } from '../../../code'

const log = debug('fideo-crawler-douyu')

const sessionId = 'aW1clyJgFEICpiJ40qCcb9DMKVL3RCTD'

function getUserIdByUrl(url) {
  const { searchParams, pathname } = new URL(url)
  const value = searchParams.get('name') || pathname.split('/')[2]
  return value
}

async function getVidByUrl(userId, others = {}) {
  const { proxy, cookie } = others
  log('userId:', userId, 'cookie:', cookie, 'proxy:', proxy)
  const data = (
    await request(
      `https://m.lailer.net/appgw/v2/uservideolist?name=${userId}&start=0&sessionid=${sessionId}`,
      {
        proxy,
        headers: {
          cookie,
          'User-Agent': DESKTOP_USER_AGENT
        }
      }
    )
  ).data
  const vid = data.retinfo.videos[0].vid
  return vid
}

const getStreamInfo = async (vid, others = {}) => {
  const { proxy, cookie } = others
  log('vid:', vid, 'cookie:', cookie, 'proxy:', proxy)
  const data = (
    await request(`https://m.lailer.net/appgw/v2/watchstart?vid=${vid}&sessionid=${sessionId}`, {
      proxy,
      headers: {
        cookie,
        'User-Agent': DESKTOP_USER_AGENT
      }
    })
  ).data
  const title = data.retinfo.title
  const nickname = data.retinfo.nickname
  const living = data.retinfo.living
  const play_url = data.retinfo.play_url
  const streamUrl = play_url ? play_url.replace('jj17.cn', 'lailer.net') : ''
  return {
    title,
    nickname,
    living,
    streamUrl
  }
}

async function baseGetLailerLiveUrlsPlugin(roomUrl, others = {}) {
  const { proxy, cookie } = others
  let userId = getUserIdByUrl(roomUrl)
  const vid = await getVidByUrl(userId, others)
  log('userId:', userId, 'vid:', vid, 'cookie:', cookie, 'proxy:', proxy)
  const { living, streamUrl } = await getStreamInfo(vid, others)
  if (living === 1 && streamUrl) {
    return {
      code: SUCCESS_CODE,
      liveUrls: [streamUrl]
    }
  }
  return {
    code: CRAWLER_ERROR_CODE.NOT_URLS
  }
}

async function baseGetLailerRoomInfoPlugin(roomUrl, others = {}) {
  let userId = getUserIdByUrl(roomUrl)
  const vid = await getVidByUrl(userId, others)
  const { name } = await getStreamInfo(vid, others)
  return {
    code: SUCCESS_CODE,
    roomInfo: { name }
  }
}

export const getLailerLiveUrlsPlugin = captureError(baseGetLailerLiveUrlsPlugin)
export const getLailerRoomInfoPlugin = captureError(baseGetLailerRoomInfoPlugin)

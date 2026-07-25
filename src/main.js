import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'

// 오프라인이 기본이다 (불변식 1). 서비스워커가 없으면 비행기 모드에서 앱 셸이 안 뜬다.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 등록 실패는 치명적이지 않다 — 온라인에서는 그대로 동작한다.
    })
  })
}

export default mount(App, { target: /** @type {HTMLElement} */ (document.getElementById('app')) })

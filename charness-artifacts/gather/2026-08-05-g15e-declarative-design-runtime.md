# Gathered Public URL

- Source: https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime.md
- Access Mode: support/web-fetch public route
- Content Persistence: `extracted`
- Route: `direct-then-fallback`
- Route Family: `public`
- Route Access Modes: grant, public, degraded
- Disposition: `success`
- Final Status: `success`
- Final Confidence: `strong`
- Source Identity: `not-applicable`

## Selected Attempt

- Stage: `direct-public-fetch`
- Tool: `curl`
- Status: `success`
- Confidence: `strong`

## Acquisition Trace

- `direct-public-fetch` via `curl`: success / strong
- `impersonated-public-fetch` via `curl_cffi`: skipped / none (prior-stage-sufficient)
- `defuddle-reader-extraction` via `defuddle`: skipped / none (prior-stage-sufficient)
- `patchright-render-recon` via `patchright`: skipped / none (prior-stage-sufficient)
- `patchright-network-recon` via `patchright`: skipped / none (prior-stage-sufficient)
- `agent-browser-render-recon` via `agent-browser`: skipped / none (prior-stage-sufficient)
- `agent-browser-network-recon` via `agent-browser`: skipped / none (prior-stage-sufficient)
- `archive-or-cache` via `direct`: skipped / none (prior-stage-sufficient)
- `clean-stop` via `direct`: skipped / none (prior-stage-sufficient)

## Open Gaps

- None recorded.

## Extracted Content

- Source Stage: `direct-public-fetch`
- Format: `markdown`
- Chars: `7209`
- Original Chars: `7209`
- Truncated: `False`

```text
# Declarative design and design runtime

> 디지털 인공물의 디자인이 점점 복잡해지고 있다. 인간이 머리로 다룰 수 있는 복잡성을 오래 전에 한참 벗어났음에도 불구하고 아직 제대로 된 해결책은 없고, 디자이너와 개발자와 사용자 모두 고생하고 있다. 새로운 방식이 필요하다.

디지털 인공물의 디자인이 점점 복잡해지고 있다. 인간이 머리로 다룰 수 있는 복잡성을 오래 전에 한참 벗어났음에도 불구하고 아직 제대로 된 해결책은 없고, 디자이너와 개발자와 사용자 모두 고생하고 있다. 새로운 방식이 필요하다.

## 문제: 디자인 공간의 조합적 폭발

데스크탑 컴퓨터, 모바일 폰, 키오스크, 자동차 대시보드, <스마트 시계>, [XR](https://wiki.g15e.com/pages/Extended%20reality.txt) 기기 등 소프트웨어가 실행되는 환경이 매우 다양해졌고 앞으로도 더 다양해질 것이다. 동일한 소프트웨어라도 아래와 같이 다양한 요소를 고려해야 한다.

- **입력 방식**: 터치 스크린의 버튼은 마우스로 조작하는 기존 <GUI> 화면의 버튼보다 더 커야한다. 손가락이 마우스 커서보다 두껍기 때문이다. 그리고 마우스 커서와 달리 손가락은 시야를 가린다는 문제도 고려해야 한다. 스마트폰 등 핸드헬드 기기인 경우 레이아웃을 디자인할 때 엄지손가락이 쉽게 도달할 수 있는 영역을 고려하는 게 좋다. 터치 스크린 이외에도 키보드만 쓰는 경우, 스타일러스를 쓰는 경우, 리모콘, 음성, 수어 등을 쓰는 경우 등을 고려할 필요가 있다.
- **가로 모드-세로 모드**: 대부분의 스마트폰과 태블릿은 가속도 센서를 이용하여 가로 모드와 세로 모드를 전환한다. 똑같은 세로 모드라고 하더라도 시스템의 상태창 두께가 달라지거나 온-스크린 키보드가 펼쳐지는 등 다양한 이유에서 화면 비율이 크게 달라질 수 있다.
- **네트워크 상태**: 다양한 이유에서 네트워크 속도가 매우 느리거나 일시적으로 네트워크가 끊어질 수 있다. 이런 경우에 어떻게 하면 소프트웨어의 동작이 완전히 멈추는 대신 좀 더 [우아하게 대처](https://wiki.g15e.com/pages/Graceful%20degradation.txt)할 수 있는지 고민해야 한다.
- **다국어 지원**: 러시아어나 독일어 단어는 평균적으로 길어서 버튼 모양에 영향을 줄 수 있다. UI를 자칫 잘못 설계하면 어떤 국가에서는 레이아웃이 틀어지거나 레이블을 다 읽지 못하게 되는 등의 문제가 생길 수 있다. 게다가 어떤 국가는 텍스트를 오른쪽에서 왼쪽으로 쓰거나 위에서 아래로 쓴다.
- **글자 크기**: 저시력자인 경우 큰 글씨를 선호할 수 있다. 반대로 한 화면에 최대한 많은 정보를 담기 위해 글자크기를 줄여서 쓰는 사용자도 있다.

그 밖에도 고대비(저시력자), 다크 모드, 좁은 여백-넓은 여백, 전자잉크 패널(화면 갱신 속도가 느리고 단색이거나 색재현력이 낮다), 발열 상태(일부 운영체제는 발열 상태에 따라 그래픽 요소의 품질이나 화면 갱신 속도 등을 조절할 수 있다), 모션 줄임(일부 사용자는 모션이 과하면 멀미 증상을 일으킨다) 등 고려할 요소는 끝도 없다.

요소가 추가되면 더하기가 아닌 곱하기가 되기 때문에 경우의 수가 순식간에 어마어마하게 커진다. 예를 들어 입력장치가 4종, 폼팩터가 5종, 화면비가 4종, 색상 옵션이 6종, 글자 옵션이 3종이라면 벌써 $4 \times 5 \times 4 \times 6 \times 3 = 1440$개 조합이 나온다. 이를 <조합적 폭발>이라고 부른다.

## 기존 방식: 대부분의 문제를 무시하기

이 문제를 해결할 방법이 아직까지 딱히 없기에 모든 가능한 조합을 고려해야한다는 주장은 비즈니스를 모르는 사람의 한가한 소리 정도로 취급될 수 밖에 없다. 현재 널리 수용되고 있는, '비즈니스를 고려한' 현실적 타협안은 이렇다.

- **상당한 요소를 고려하지 않는다**: 예를 들어 글자를 오른쪽에서 왼쪽으로 쓰는 사용자 등 비즈니스적으로 중요하지 않다고 여겨지는 요소를 아예 고려하지 않는다.
- **고려하기로 정한 요소들로 만들어질 수 있는 모든 조합 중 대부분을 고려하지 않는다**: 예를 들어 "고대비" 설정을 선택한 사용자는 "다크 모드"를 고를 수 없다거나, 영어 화자는 다섯가지 음성 중 하나를 고를 수 있지만 한국어 화자는 한 가지 음성만 고를 수 있다거나 하는 식으로, 어떤 요소들을 고려하기로 정한 경우에도 각 요소들의 모든 가능한 조합을 다 고려하지 않고 일부만 고려한다. 마치 "디카페인 아메리카노"를 고르는 순간 원두는 고르지 못하게 되는 것과 비슷하다.

이렇게 하면 디자인의 복잡도를 간신히 관리 가능한 수준으로 낮출 수 있게 된다. 하지만 이로 인해 오늘날 만들어지는 거의 모든 디지털 인공물은 실제로 해결해야 하는 문제의 극히 일부만 해결한 채로 시장에 나온다.

그 결과, [주변화된 상황에 놓인 이들](https://wiki.g15e.com/pages/Marginalized%20groups.txt)이 디지털 환경에서도 더 다양한 문제를 겪게 된다. 풀어야할 문제를 방치할 때 항상 나타나는 현상이다.

## 근본 원인: 캔버스에 요소를 배치하기

기존의 디자인 방식은 "캔버스에 요소를 배치하기" 메타포에 기반을 두고 있다. 좀 더 자세히 말하자면 "정해진 판형의 캔버스 위에 정적인 그래픽 요소를 배치하기" 방식이다. 기존의 디자인 방법과 도구들이 인쇄 매체를 위한 디자인 방법론에서 파생되었기 때문이다.

우리가 디지털 디자인을 공부하는 방식이나 우리가 사용하는 디자인 소프트웨어가 모두 이 메타포의 영향 하에 있다.

주요 대학의 디자인 교육 과정은 [타이포그래피](https://wiki.g15e.com/pages/Typography.txt)와 인쇄 매체를 위한 <시각 디자인> 이론을 주로 다룬다. "디지털 미디어 디자인" 같은 이름을 붙인 학과라도 근본적인 차이는 없다. 아직 체계적인 대안 이론이 없기 때문이다.

거의 모든 디자인 소프트웨어도 마찬가지다. 화면의 가장 넓은 영역을 "캔버스"가 차지하고 있고 이 영역에 마우스로 무언가를 가져다 놓는 게 핵심 인터페이스다. 과거에 쓰던 도구(예: <포토샵>)에 비해 요즘에 쓰는 도구(예: <피그마>)는 아주 서서히 이 메타포에서 벗어나고 있지만, 여전히 큰 틀에서는 변하지 않았다.

## 대안: 의도를 선언하기

나는 디자인을 하는 방식과 도구가 기존의 "캔버스에 요소를 배치하기"로부터 "의도를 선언하기"로 바뀌어야 한다고 생각한다. 둘의 차이를 살펴보자.

웹 디자인의 초창기에는 상당수의 웹사이트에 "이 사이트는 1024x768 해상도에 최적화되어 있습니다" 같은 문구가 있었고, 실제로 사용자의 브라우저 크기가 이 해상도에 맞지 않으면 사이트를 제대로 이용하기가 어려웠다.

그런데 1024px이라는 건 뭘까? 블로그 글을 담고 있는 HTML 요소의 스타일에 `width: 1024px`이 설정되어 있다고 치자. 너비가 1024px이라는 게 무슨 말일까? 사용자의 모니터 너비가 1024px이고 브라우저가 화면을 꽉 채우고 있을 걸로 가정하고, 그런 사용자가 방문했을 때 본문의 글줄 길이가 화면을 꽉 채우기를 **의도하며** 쓴 수치이다.

하지만 화면이 1024px보다 작다면? 가로 스크롤이 생겨서 글을 읽기가 영 불편해진다. 그렇다면 사실 `width: 1024px`은 `width: 100%` 등으로 바뀌어야 한다. 그래야 화면이 좁아져도 가로 스크롤이 안생긴다.

하지만 화면 너비가 1024px이 아니라 이것보다 훨씬 넓다면? 글줄 길이가 너무 길어져서 글을 읽기가 어려워진다. 그렇다면 사실 `width: 100%`는 아마도 `max-width: 960px`처럼 바뀌어야 한다. 그래야 화면이 넓어져도 글줄 길이가 너무 커지는 걸 방지할 수 있다. 이 상황에서는 `width: 100%`보다 `max-width: 960px`이 디자이너의 **의도**를 더 잘 드러낸다.

그런데 960px이라는 수치는 어디에서 나왔을까? 아마 기본 글자 크기가 16px이고 한 줄에 최대 60글자 이내로 나오게 하고 싶어서 쓴 수치($16 \times 60 = 960$)일거다. 그렇다면 사실 `max-width: 960px`은 `max-width: 60rem`으로 바꿔야 한다. 그래야 사용자가 기본 글자 크기를 키우거나 줄여도 **의도**가 더 잘 반영되기 때문이다.

그런데 "너비"가 중요한 이유는 무엇일까? 글을 왼쪽에서 오른쪽으로, 즉 가로로 쓴다고 가정하기 때문이다. 글을 세로로 쓰는 문화권이라면 "글줄 길이"는 "너비"가 아니라 "높이"랑 연결된다. 그렇다면 사실 `max-width: 60rem`은 아마도 `max-inline-size: 60rem`으로 바꿔야 한다.

`width: 1024px`은 "너비를 1024px로 한다"라는 디자인 결정을 표현한다면, `max-inline-size: 60rem`은 "글을 쓰는 방향을 고려하여, 글줄 길이가 최대 60글자가 넘지 않도록 한다"라는 디자인 의도를 표현한다. 전자는 "캔버스에 요소를 배치하기"에 가깝고 후자는 "디자인 의도를 선언하기"에 가깝다.

위 예시에서는 요소의 길이라는 면에서만 설명을 했지만, 요소의 위치, 요소 간의 간격, 움직임, 색상, 소리, 진동 등 모든 측면에 적용할 수 있다. 예를 들어 디자이너가 브랜드 색상을 지정하고 의도를 선언하면 의도에 맞는 색상들을 브랜드 색상으로부터 자동으로 유도하고 용도에 부합하도록 색조, 채도, 명도 등을 조절하여 배경색이나 글자색이 알아서 지정되도록 하는 방식을 생각해볼 수 있다.

<피그마> 등 일부 디자인 툴이 변수, 자동 레이아웃 등의 기능을 추가하고 있지만 아직 갈 길이 멀다. [CSS](https://wiki.g15e.com/pages/Cascading%20Style%20Sheets.txt)에도 논리적 속성이 추가되고 색상 관련 함수들이 추가되는 등 의도를 더 잘 표현할 수 있는 방법이 늘고 있지만 아직 불완전하다.

## 정적 디자인 검사기, 디자인 런타임, 통합 디자인 환경

"캔버스에 요소를 배치하기"에서 "의도를 선언하기"로 이행하려면 디자인 런타임이라는 개념이 필요하다고 생각한다.

"캔버스에 요소를 배치하기" 방식에서는 디자이너가 디자인 파일을 수정하는 동안(즉, 디자인 타임) 대부분의 디자인이 실현된다. 디자인의 일부(다크모드, 가로보기, 큰 글씨, 모션줄임, 고대비 등)는 사용자가 해당 인공물을 사용하는 시점(즉, 런타임)에 실현되는데, 디자이너가 디자인 타임에 미쳐 고려하지 못한 (혹은 비즈니스적 제약으로 인해 고려하지 않기로 정한) 조합을 선택하는 경우 디자인이 망가진다. 또는 아예 그런 조합은 선택할 수 없거나.

"의도를 선언하기" 방식에서는 디자이너가 자신의 의도를 명시하는 일에 주력할 것이다. 디자인 정적 검사기는 디자이너가 명시한 의도들이 심미적 측면 측면이나 [보편 디자인](https://wiki.g15e.com/pages/Universal%20design.txt) 관점의 <사용성> 측면 등에서 서로 모순되지 않는지, 모든 가능한 조합에서 실현 가능한지를 검사해준다. 디자인 런타임은 디자이너의 의도, 사용자의 특성과 선호, 사용자가 놓인 맥락 등을 입력으로 받아서 실시간으로 디자인을 실현한다:

$$
\text{design outcome} = f(\text{design intent}, \text{user preference}, \text{context})
$$

이런 걸 상상해본다:

- 지금의 [CSS](https://wiki.g15e.com/pages/Cascading%20Style%20Sheets.txt)에서 디자인 결정 사항을 표현하기 위한 요소들을 줄이고 디자인 의도를 더 잘 담아낼 수 있도록 개선된 형태의 선언적 언어
- 지금의 린터보다 훨씬 발전된 정적 디자인 검사기
- 지금의 브라우저 렌더링 엔진보다 좀 더 진보된 (더 많은 걸 런타임에 결정하고 계산해준다는 의미에서) 디자인 런타임
- 디자인 의도를 명시하는 구체적 방법, 의도의 선언으로부터 디자인 구현까지의 과정을 체계적으로 다루는 디자인 이론
- 이 언어를 이용하여 디자인 의도를 잘 표현할 수 있게 도와주는 통합 디자인 환경(Integrated Design Environment?)

## 의도 선언만으로 모든 게 해결될까

디자인은 알고리즘이 아니므로 사람의 개입이 필요한 면들이 있다. 몇 가지 예를 들어보면…

- **Optical alignment**: 명함 디자인 등을 하는 경우 서체 하나하나의 간격을 미세하게 조정(kerning)할 필요가 있다. 이걸 어느정도 자동으로 해주는 소프트웨어가 있지만(예: InDesign) 디자이너에 따라 만족하지 못하는 경우가 종종 있는 것 같다.
- **Simultaneous contrast**: 지각적으로 보정된 색공간(CIELab 등)을 쓴다고 하더라도 인간의 시지각에는 오만가지 꼼수가 숨어 있기 때문에 진정으로(?) 통제된 색상 지각을 보장하기가 쉽지 않다. 예를 들어 동일한 색이라고 하더라도 근처에 어떤 색이 있느냐에 따라 다르게 지각되기 때문에 섬세한 디자인을 하려면 사람의 손이 필요하다.
- **Color size effect**: 컬러 패치의 크기 작아질수록 색상 차이를 구분하기가 어려워진다.

이런 수없이 많은 이유로 인해서 사람의 손을 탈 필요가 (아직은) 있다. 하지만 물론 이러한 시지각의 특성들도 알고리즘화하려는 시도가 [없지는 않다](https://graphics.cs.wisc.edu/Papers/2014/ASG14/template_ist_ltr.pdf).

## 마치며

도구는 사고에 지대한 영향을 준다. 평소 어떤 방식으로 일하고 어떤 종류의 도구를 쓰는지에 따라 일상에서 우리의 역량이 얼마나 꾸준히 발달하는지도 달라진다.

"의도를 선언하기"가 아닌 "캔버스에 요소를 배치하기" <패러다임>의 도구를 쓰기 때문에 우리는 자신의 의도를 의식적으로 생각하고 명시적으로 서술하는 훈련을 받기 어렵다. 간혹 교수에 따라 작업물의 의도를 논리적으로 설명하는 훈련을 시키기도 하지만, 애초에 <자연어>로 서술하는 의도는 모호하고 빈틈이 많다. 게다가 학교에서 만들어내는 대부분의 결과물은 고정된 판형 위에 놓인 거의 (혹은 완전히) 정적인 그래픽 요소들이라는 점에서, 의도와 결과물 사이의 유기적 관계는 "작업"이 끝나는 시점에 사라져버린다.

"의도를 선언하기" 방식으로의 전환(서서히 그렇게 될거라고 본다)은 디자이너, 개발자, 사용자(특히 주변화된 사용자) 모두에게 이로운 방향이라고 생각한다. 심지어 [에이전트 기반 코딩](https://wiki.g15e.com/pages/Agentic%20coding.txt) 환경에도 유리하다.
```

## Trace JSON

```json
{
  "source_url": "https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime.md",
  "route": {
    "input_url": "https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime.md",
    "normalized_host": "wiki.g15e.com",
    "route_id": "direct-then-fallback",
    "route_family": "public",
    "summary": "Try direct public fetch first, then reader, metadata-only, and archive fallback in order.",
    "required_tools": [
      "curl"
    ],
    "access_modes": [
      "grant",
      "public",
      "degraded"
    ],
    "fallback_order": [
      "direct-public-fetch",
      "domain-specific-route",
      "impersonated-public-fetch",
      "defuddle-reader-extraction",
      "patchright-render-recon",
      "patchright-network-recon",
      "agent-browser-render-recon",
      "agent-browser-network-recon",
      "reader-or-metadata-fallback",
      "archive-or-cache",
      "clean-stop"
    ],
    "acquisition_plan": [
      {
        "stage_id": "direct-public-fetch",
        "tool_id": null,
        "when": "Start here for public URLs unless a stronger domain route is known.",
        "proof": "classify-fetch-response"
      },
      {
        "stage_id": "impersonated-public-fetch",
        "tool_id": "curl_cffi",
        "when": "Retry public HTML with browser-like TLS/HTTP impersonation before paying browser-render cost.",
        "proof": "classify-fetch-response plus impersonation profile"
      },
      {
        "stage_id": "defuddle-reader-extraction",
        "tool_id": "defuddle",
        "when": "Use for article-like public pages when direct HTML is weak, cluttered, or partial.",
        "proof": "clean markdown plus source URL and classifier confidence"
      },
      {
        "stage_id": "patchright-render-recon",
        "tool_id": "patchright",
        "when": "Use a headless Patchright Chromium render when fetch/reader paths are blocked, JS-rendered, or unclear.",
        "proof": "headless rendered body text and access mode"
      },
      {
        "stage_id": "patchright-network-recon",
        "tool_id": "patchright",
        "when": "For collection intent, record public-looking /api/, /graphql, or .json requests seen by headless Patchright.",
        "proof": "network request candidates; no clicks, form submits, or login bypass"
      },
      {
        "stage_id": "agent-browser-render-recon",
        "tool_id": "agent-browser",
        "when": "Use for JS-rendered pages, empty SPA shells, repeated challenge signals, or weak cleaner output.",
        "proof": "rendered body text/html and access mode"
      },
      {
        "stage_id": "agent-browser-network-recon",
        "tool_id": "agent-browser",
        "when": "Use for list/collection intent to record public-looking /api/, /graphql, or .json request candidates.",
        "proof": "network request candidates; no clicks, form submits, or login bypass"
      },
      {
        "stage_id": "archive-or-cache",
        "tool_id": null,
        "when": "Use only when a stale or cached source still honestly answers the request.",
        "proof": "archive/cache source identity and freshness caveat"
      },
      {
        "stage_id": "clean-stop",
        "tool_id": null,
        "when": "Stop when access, auth, challenge, or confidence gaps remain.",
        "proof": "recorded failure mode and missing capability"
      }
    ],
    "notes": [
      "Do not skip the direct path when the page may still be readable as plain HTML."
    ]
  },
  "disposition": "success",
  "attempts": [
    {
      "stage_id": "direct-public-fetch",
      "tool_id": "curl",
      "status": "success",
      "confidence": "strong",
      "elapsed_s": 0.0,
      "output_chars": 7209,
      "classification": {
        "status": "success",
        "confidence": "strong",
        "text_length": 7209,
        "matched_signals": [
          "text:Declarative design and design runtime"
        ],
        "signals": [
          "positive-proof",
          "content-negotiated-markdown"
        ],
        "proof": [
          {
            "type": "text",
            "value": "Declarative design and design runtime"
          }
        ],
        "proof_errors": [],
        "fallback_candidates": [
          "clean-stop"
        ],
        "recommended_next_step": "Use the captured Markdown source and preserve its representation."
      },
      "details": {
        "accept": "text/markdown",
        "content_type": "text/markdown; charset=utf-8",
        "capture_note": "Captured with an explicit Markdown Accept header because the generic HTML route returned a login-wall false positive."
      }
    },
    {
      "stage_id": "impersonated-public-fetch",
      "tool_id": "curl_cffi",
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "defuddle-reader-extraction",
      "tool_id": "defuddle",
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "patchright-render-recon",
      "tool_id": "patchright",
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "patchright-network-recon",
      "tool_id": "patchright",
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "agent-browser-render-recon",
      "tool_id": "agent-browser",
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "agent-browser-network-recon",
      "tool_id": "agent-browser",
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "archive-or-cache",
      "tool_id": null,
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    },
    {
      "stage_id": "clean-stop",
      "tool_id": null,
      "status": "skipped",
      "confidence": "none",
      "elapsed_s": 0.0,
      "output_chars": 0,
      "details": {
        "reason": "prior-stage-sufficient"
      }
    }
  ],
  "selected_attempt": {
    "stage_id": "direct-public-fetch",
    "tool_id": "curl",
    "status": "success",
    "confidence": "strong",
    "elapsed_s": 0.0,
    "output_chars": 7209,
    "classification": {
      "status": "success",
      "confidence": "strong",
      "text_length": 7209,
      "matched_signals": [
        "text:Declarative design and design runtime"
      ],
      "signals": [
        "positive-proof",
        "content-negotiated-markdown"
      ],
      "proof": [
        {
          "type": "text",
          "value": "Declarative design and design runtime"
        }
      ],
      "proof_errors": [],
      "fallback_candidates": [
        "clean-stop"
      ],
      "recommended_next_step": "Use the captured Markdown source and preserve its representation."
    },
    "details": {
      "accept": "text/markdown",
      "content_type": "text/markdown; charset=utf-8",
      "capture_note": "Captured with an explicit Markdown Accept header because the generic HTML route returned a login-wall false positive."
    }
  },
  "final_status": "success",
  "final_confidence": "strong"
}
```


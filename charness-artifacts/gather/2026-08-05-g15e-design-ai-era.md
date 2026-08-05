# Gathered Public URL

- Source: https://wiki.g15e.com/pages/Design%20in%20the%20AI%20era.md
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
- Chars: `2096`
- Original Chars: `2096`
- Truncated: `False`

```text
# Design in the AI era

> AI 시대에 디자이너는 어떻게 일을 해야할까에 대한 고민.

AI 시대에 디자이너는 어떻게 일을 해야할까에 대한 고민.

## AI에게 시켜서는 안될 일 구분하기

[AI](https://wiki.g15e.com/pages/Artificial%20intelligence.txt)를 잘 쓰려면 AI에게 시켜서는 안될 종류의 일들을 파악하고 이런 일을 효율화할 방법을 찾는 게 중요하다. 그렇지 않으면…

- AI에게 시키지 않아야할 일을 AI에게 시키는 바람에 문제가 생기거나, (품질 저하)
- AI에게 시키지 않아야할 일을 기존 방식대로 하느라 병목이 생긴다. (<생산성> 저하)

예를 들어 [LLM](https://wiki.g15e.com/pages/Large%20language%20model.txt)은 [환각](https://wiki.g15e.com/pages/Hallucination%20(AI.txt))에 취약하기 때문에 "[접근성](https://wiki.g15e.com/pages/Accessibility.txt)에 위배되지 않는 색상 조합을 써"라고 지시해도 안지켜질 가능성이 높다.

AI에게 안심하고 작업을 위임하려면 디자이너가 정한 원칙들이 지켜지도록 강제할 방법이 필요하다.

## 색상

<프로그래밍>에서는 각종 정적 검사기와 [단위 테스트](https://wiki.g15e.com/pages/Unit%20test.txt)가 그런 역할을 한다. 이런 장치가 많을수록 점점 더 안심하고 위임할 수 있게 된다. [디자인](https://wiki.g15e.com/pages/Design.txt)에도 그런 역할을 해줄 장치들을 생각해보면 좋겠다.

일단은 그나마 색상이 쉬워 보인다. 인간의 [색상 지각](https://wiki.g15e.com/pages/Color%20perception.txt)에 대한 연구는 공학적으로 상당히 발전했기 때문에 써먹을 수 있는 이론과 도구가 이미 많기 때문.

- 접근성 위반 여부 자동 검사
- [접근성](https://wiki.g15e.com/pages/Accessibility.txt)을 보장하면서 다크 모드, 고대비 모드 등을 자동 생성
- 적록색맹, 전색맹 등 다양한 사용자를 고려한 색상 팔레트 자동 생성

참고: [계산적 색상 시스템](https://wiki.g15e.com/pages/Computational%20color%20system.txt)

## 레아아웃, 타이포그래피

이런 작업이 어느 정도 성공하면 레이아웃이나 [타이포그래피](https://wiki.g15e.com/pages/Typography.txt) 등 다른 시각 요소들로도 점진적으로 확장해볼 수 있을 것.

디자인은 본질적으로 [다차원적 관심사 분리](https://wiki.g15e.com/pages/Multidimensional%20separation%20of%20concerns.txt)를 필요로 하기 때문에 [애스펙트 위빙](https://wiki.g15e.com/pages/Aspect%20weaving.txt) 문제를 해소할 방법들이 필요한데(예를 들어 타이포그래피의 특성에 따라 그리드의 여백이 영향을 받는다거나), 이런 논의는 딱히 어디에서 되고 있는지 찾기도 어렵다.

## 비전

낮은 수준의 기능적 세부 사항은 프로그램이 자동으로 잡아줄거라고 믿고, 인간과 AI는 더 창의적이고 실험적인 작업을 마음놓고 할 수 있게 되면 좋겠다. 마치 구조역학이 발달한 덕에 현대의 건축가들은 극도로 창의적일 수 있게 된 것처럼.

혹자는 AI 시대의 소프트웨어가 더이상 장인의 공예품이 아닌 공산품이 되어버릴 것이라는 얘기를 하는데, 그 다음 단계를 상상해보면 좋겠다.

## 관련 글

- [취향이 담긴 소프트웨어](https://wiki.g15e.com/pages/Tasteful%20software.txt)
- [선언적 디자인과 디자인 런타임](https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime.txt)
- [성급한 UI 디자인 종말론](https://wiki.g15e.com/pages/Premature%20death%20of%20UI%20design.txt)
```

## Trace JSON

```json
{
  "source_url": "https://wiki.g15e.com/pages/Design%20in%20the%20AI%20era.md",
  "route": {
    "input_url": "https://wiki.g15e.com/pages/Design%20in%20the%20AI%20era.md",
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
      "output_chars": 2096,
      "classification": {
        "status": "success",
        "confidence": "strong",
        "text_length": 2096,
        "matched_signals": [
          "text:Design in the AI era"
        ],
        "signals": [
          "positive-proof",
          "content-negotiated-markdown"
        ],
        "proof": [
          {
            "type": "text",
            "value": "Design in the AI era"
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
    "output_chars": 2096,
    "classification": {
      "status": "success",
      "confidence": "strong",
      "text_length": 2096,
      "matched_signals": [
        "text:Design in the AI era"
      ],
      "signals": [
        "positive-proof",
        "content-negotiated-markdown"
      ],
      "proof": [
        {
          "type": "text",
          "value": "Design in the AI era"
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


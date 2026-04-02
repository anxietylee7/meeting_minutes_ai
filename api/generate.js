export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { rawText, template, dict, milestones } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 또는 gpt-4o
        messages: [
          {
            role: "system",
            content: `너는 게임 개발사 스마일게이트의 전문 회의록 작성 AI야. 
            주어진 회의 내용을 분석해서 반드시 아래 규칙에 맞는 JSON 형태로 반환해줘.

            [사용자가 선택한 회의 템플릿: ${template}]
            - 템플릿 성격에 맞춰 특정 항목을 중점적으로 요약할 것.

            [부서별 업무 분류 기준 (매우 중요)]
            - AI센터: LM, LLM, TTS, 다국어 모델 적용, 프롬프트, 번역/생성 품질 테스트 등 AI 모델과 관련된 모든 연구/테스트 업무. (절대 개발실로 분류하지 말 것)
            - 개발실: 서비스 연동(API), 게임 클라이언트/서버 적용, 인프라 아키텍처 구축 등.

            [JSON 키값 구조 및 엄격한 작성 가이드]
            - keyPoints: 회의의 핵심 내용을 Markdown 불릿 포인트(- ) 형식으로 3~5줄로 짧게 요약.
            - fullSummary: 회의 전체 내용을 빠짐없이 요약한 단일 문자열. **매우 중요: 절대 서술형 문장(줄글)을 쓰지 말고, 반드시 '- ' 로 시작하는 계층형 마크다운 리스트 형태로만 작성할 것.** (예시: "- 1. 주제\\n  - 세부내용\\n- 2. 주제")
            - decisions: 확정된 결정사항을 문자열 배열(Array)로 작성.
            - followUps: 후속 진행 사항(담당자가 명확한 액션 아이템)을 위의 기준에 따라 분류한 객체.
              - "planning": 기획실 관련 업무
              - "development": 개발실 관련 업무
              - "management": 개발관리실 관련 업무
              - "ai": AI센터 관련 업무 (LM, TTS 등)
              *(해당 부서 업무가 없으면 빈 배열 [] 반환)*
            - pending: 아직 확정되지 않고 **논의가 필요한 사항** (예: 검증 시스템 구축 방안 등)을 문자열 배열로 작성.
            - issues: 현재 확인된 이슈나 리스크 사항을 문자열 배열(Array)로 작성.
            - etc: 다음 회의 일정이나 기타 참고 사항을 문자열로 작성 (없으면 null).`
          },
          { role: "user", content: rawText }
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI Error:", data);
      return res.status(response.status).json({ 
        error: `OpenAI 에러: ${data.error?.message || '알 수 없는 에러'}` 
      });
    }

    const resultJson = JSON.parse(data.choices[0].message.content);
    res.status(200).json(resultJson);

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "서버 내부 에러가 발생했습니다." });
  }
}

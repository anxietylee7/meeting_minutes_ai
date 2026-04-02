export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // links 배열 추가 수신
  const { rawText, template, dict, milestones, links } = req.body;

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
            
            [참고 링크 정보]
            - 입력된 참고 링크: ${links && links.length > 0 ? links.join(', ') : '없음'}
            - 만약 참고 링크가 존재한다면, 해당 링크 자료가 함께 리뷰/참조되었다는 사실을 전체 내용 요약이나 기타 항목에 자연스럽게 명시할 것.

            [부서별 업무 분류 기준 (매우 중요)]
            - AI센터: LM, LLM, TTS, 다국어 모델 적용, 프롬프트, 번역/생성 품질 테스트 등 AI 모델과 관련된 모든 연구/테스트 업무.
            - 개발실: 서비스 연동(API), 게임 클라이언트/서버 적용, 인프라 아키텍처 구축 등.

            [JSON 키값 구조 및 엄격한 작성 가이드]
            - keyPoints: 회의의 핵심 내용을 Markdown 불릿 포인트(- ) 형식으로 짧게 요약.
            - fullSummary: 회의 전체 내용을 빠짐없이 요약한 단일 문자열.
              ※ 매우 중요: 반드시 '- ' 로 시작하는 계층형 마크다운 리스트 형태로 작성할 것. 
              ※ 매우 중요: 절대 '~다'로 끝나는 서술형 문장을 쓰지 말 것. 반드시 '~함', '~임', '~예정' 형태의 개조식(명사형 종결)으로 작성할 것.
            - decisions: 확정된 결정사항을 문자열 배열(Array)로 작성. (이 부분도 개조식 사용)
            - followUps: 후속 진행 사항(액션 아이템)을 부서별로 분류한 객체.
              ※ 주의: 각 부서의 배열 안에는 반드시 {"task": "할일 내용", "assignee": "담당자 이름(없으면 null)"} 형태의 '객체(Object)'만 들어가야 함.
              - "planning": 기획실 관련 업무 배열
              - "development": 개발실 관련 업무 배열
              - "management": 개발관리실 관련 업무 배열
              - "ai": AI센터 관련 업무 배열
              *(해당 부서 업무가 없으면 빈 배열 [] 반환)*
            - pending: 아직 확정되지 않고 논의가 필요한 사항을 문자열 배열로 작성.
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

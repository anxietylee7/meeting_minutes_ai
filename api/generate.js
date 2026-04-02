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
            - 템플릿 성격에 맞춰 특정 항목을 중점적으로 요약할 것. (예: 기획 리뷰는 고려 사항 및 기획 완료 일정, 개발 회의는 개발 마감 일정 등)

            [부서별 업무 분류 기준 (매우 중요)]
            - AI센터: LM, TTS, 이미지 생성 등 코어 AI 기술의 연구 개발(R&D), 원천 모델 학습, 파인튜닝, 프롬프트 엔지니어링, 품질 개선 등 'AI 자체'를 다루는 업무.
            - 개발실: AI센터가 만든 모델의 서비스 연동(API 호출), 게임 클라이언트/서버 적용, 백엔드/프론트엔드 개발, 인프라 아키텍처 구축, 서비스 개발 마감 등 '프로덕트 구현' 업무.

            [JSON 키값 구조 및 엄격한 작성 가이드]
            - keyPoints: 회의의 핵심 내용을 Markdown 불릿 포인트(- ) 형식으로 3~5줄로 짧게 요약.
            - fullSummary: 회의 전체 내용을 빠짐없이 요약한 **단일 문자열(String)**. (절대 배열 Array로 반환하지 말 것). 줄글(서술형 단락)이나 특수기호(◦, ▪, ㅇ 등)를 직접 쓰지 말고, 반드시 스페이스바 2칸 들여쓰기와 하이픈(-)을 사용하는 올바른 마크다운 계층형 리스트 문법만 사용할 것.
            - decisions: 확정된 결정사항을 문자열 배열(Array)로 작성.
            - followUps: 후속 진행 사항(액션 아이템)을 위의 [부서별 업무 분류 기준]에 따라 정확히 분류한 객체. (기한, 우선순위는 작성 금지. 담당자만 명시할 것)
              - "planning": 기획실 관련 업무 (정책 설정, 기획 완료, 고려 사항 정리 등)
              - "development": 개발실 관련 업무 (서비스 연동, 아키텍처, 개발 마감 등)
              - "management": 개발관리실 관련 업무 (일정, 리소스, QA 등)
              - "ai": AI센터 관련 업무 (AI 기술 R&D, 모델 학습 등)
              *(해당 부서 업무가 없으면 빈 배열 [] 반환)*
            - issues: 현재 확인된 이슈, 리스크, 또는 중요 고려 사항을 문자열 배열(Array)로 작성.
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

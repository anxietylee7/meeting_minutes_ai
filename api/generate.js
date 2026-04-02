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
        model: 'gpt-4o-mini',
        messages: [
          {
            role: "system",
            content: `너는 게임 개발사 스마일게이트의 전문 회의록 작성 AI야. 
            주어진 회의 내용을 분석해서 반드시 JSON 형태로 반환해줘.
            
            [JSON 키값 구조 및 작성 가이드]
            - keyPoints: 회의의 핵심 내용을 Markdown 불릿 포인트(- ) 형식으로 3~5줄로 짧게 요약.
            - fullSummary: 회의 전체의 맥락과 세부 내용을 줄글 형태로 상세하게 요약.
            - decisions: 확정된 결정사항을 문자열 배열(Array)로 작성.
            - followUps: 후속 진행 사항(액션 아이템)을 배열(Array)로 작성. (각 객체는 task, assignee, due, priority 키를 가짐. priority는 'high', 'mid', 'low' 중 택 1)
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

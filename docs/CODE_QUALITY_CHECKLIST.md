# Frontend Code Quality Checklist

## Type Safety
- [ ] `any` 사용 최소화
- [ ] nullable/optional field가 과도하지 않음
- [ ] domain model과 UI model이 불필요하게 섞이지 않음
- [ ] discriminated union이 필요한 상태는 명확히 모델링됨

## Component Design
- [ ] page component가 지나치게 많은 책임을 갖지 않음
- [ ] 재사용 가능한 UI는 적절히 분리됨
- [ ] 반대로 한 번만 쓰는 컴포넌트를 과도하게 추상화하지 않음
- [ ] props가 과도하게 많지 않음
- [ ] prop drilling이 심하지 않음

## State Management
- [ ] server state와 client state가 분리됨
- [ ] 불필요한 global state 없음
- [ ] `useEffect`로 파생 상태를 동기화하지 않음
- [ ] 불가능한 상태 조합이 생기지 않도록 모델링됨

## Next.js
- [ ] 불필요한 `"use client"` 없음
- [ ] Server Component로 유지 가능한 부분은 유지
- [ ] route/page/layout 책임이 명확함

## Async / Error Handling
- [ ] loading / error / success 상태가 구분됨
- [ ] 중복 요청 방지
- [ ] 취소된 요청 후 상태가 정상 복구됨
- [ ] 실패 후 재시도 가능
- [ ] 오류를 숨기지 않음

## Maintainability
- [ ] 중복 코드 없음
- [ ] 함수/컴포넌트 이름이 역할을 설명함
- [ ] dead code 없음
- [ ] mock data가 component 내부에 하드코딩되지 않음
- [ ] dependency가 불필요하게 추가되지 않음

## Accessibility
- [ ] button/link semantic 적절
- [ ] label과 input 연결
- [ ] keyboard focus 확인
- [ ] error message 접근성 제공

## Validation
- [ ] TypeScript 통과
- [ ] ESLint 통과
- [ ] production build 통과
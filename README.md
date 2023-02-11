# 항해 99 실전 프로젝트

<img width="738" alt="스크린샷 2023-02-10 오후 1 57 20" src="https://user-images.githubusercontent.com/117972533/218005049-a2cd84d1-05fb-4022-abbe-ae374472e1b9.png">


# 소개

* 테이블에 열려있는 카드를 비교해서 상대의 카드를 맞추는 전략 게임😏
* 조커를 원하는 위치에 배치해 상대방을 속여 내 턴을 가져오는 전략 게임🤥
* 지친 일상속 간단하게 즐기는 온라인 보드게임 다빈치코드로 스트레스를 날리세요!🔥
* 게임에 참여해 상위 10위 랭커에 도전하세요! (랭킹은 한 시간마다 갱신됩니다!✨)
* 가족, 연인, 지인 함께하고 싶은 사람과 진검승부 한판! (싸우시면 안됩니다🙏)

# 규칙

코드 한 줄을 쓰더라도 글자 하나하나에 의미가 있어야 한다!!!

## CI/CD

<details>
<summary>Why?</summary>
<p>
여러 프로젝트를 진행하다 자연스레 중요하다 생각되는 점이 있었는데, 바로 즉각적인 피드백과 지속적인 품질 유지다. 이를 극대화한 것이 바로 CI는 개념이며 여기서 조금 더 나아간 CI/CD가 있다. 추가로 CI/CD가 속도와 효율은 추구한다는 점이 지금 상황에서 이를 채용하기에 충분했다.
</p>
</details>

## GIT 전략

- 브랜치 전략은 [GitHub Flow](https://subicura.com/git/guide/github-flow.html#github-flow-%E1%84%87%E1%85%A1%E1%86%BC%E1%84%89%E1%85%B5%E1%86%A8) 채용
- 선빵필승, 충돌 발생 시 나중에 병합하는 사람이 충돌 해결하기
- 커밋하기 전에 모든 불피요한 주석, console.log() 제거하기
- 각 커밋은 최소한의 단위로 쪼개서 할 것!

<details>
<summary>Why?</summary>
<p>
개발을 공부하면서 Git을 접하게 됐고 협업도 해보며 다양한 전약을 도입해봤다. 처음에는 각자의 브랜치를 만들어 작업한 뒤, 특정 주기마다 메인 브랜치와 병합하는 전략을 사용 해봤지만 브랜치 하나의 생명 주기가 사실상 무한하므로 서로의 피드백은 거의 배포 직전에서야 이루어졌다. 이는 누군가 한 번 잘못된 방향으로 향했을 경우 좋지 못한 결과를 낳았다.
Git Flow라는 전략도 사용해 봤지만 적은 인원으로 이뤄진 프로젝트에 이를 적용하기에는 쓸모 없는 단계가 너무 많았다.
결국 하나의 브랜치에만 집중하자! 대신 테스트와 배포를 자동화하는 방향으로 가자!라는 생각으로 GitHub Flow라는 전략을 사용하기로 했다.
</p>
</details>

## 네이밍 컨벤션

딱 봤을 때 무슨 역할을 하는지 알 수 있게!

- 파일: 접미사를 제외한 나머지는 dash-case, ex: auth.service.ts
- 인터페이스: PascalCase
- 클래스: PascalCase
- 타입: PascalCase
- 인스턴스: 클래스 이름을 camelCase로 치환
- 모델: PascalCase
- URI: dash-case
- 변수: camelCase, 명사
- 함수: camelCase, 동사

## 코딩 컨벤션

- 클래스 멤버 순서:
  1. 필드
  2. 생성자
  3. 메서드

## Git 커밋 컨벤션

> <타입>: <제목>
>
> <내용(선택 사항)>

### 타입:

모두 소문자로 작성

- feat: 새로운 기능이 추가
- fix: 버그 수정
- chore: 패키지 매니저, 빌드 정보 수정
- refactor: 리팩터링
- style: 코드 포멧 등의 스타일 변경
- test: 테스트 코드
- docs: 문서 수정

### 제목:

- 최대 50자
- 한글로 작성하며 특수기호 미사용
- 최대한 간결하게 요점만

### 내용:

제목으로는 설명이 부족할 때 작성

- 한 줄당 72자 이하
- 최대한 자세히 설명

참고 사이트: https://www.conventionalcommits.org/ko/v1.0.0-beta.4/#%ea%b0%9c%ec%9a%94


## title

<details>
<summary>Why?</summary>
<p>
</p>
</details>

# 기술 스택

<img src="https://img.shields.io/static/v1?label=&color=3178C6&message=TypeScript&logo=TypeScript&style=flat-square&logoColor=ffffff"> <img src="https://img.shields.io/static/v1?label=&color=339933&message=Node.js&logo=Node.js&style=flat-square&logoColor=ffffff"> <img src="https://img.shields.io/static/v1?label=&color=000000&message=Express&logo=Express&style=flat-square&logoColor=ffffff"> <img src="https://img.shields.io/static/v1?label=&color=%23010101&message=Socket.io&logo=Socket.io&style=flat-square&logoColor=ffffff"> <img src="https://img.shields.io/static/v1?label=&color=%23DC382D&message=Redis&logo=Redis&style=flat-square&logoColor=ffffff"> <img src=""> <img src="https://img.shields.io/static/v1?label=&color=%234479A1&message=MySQL&logo=MySQL&style=flat-square&logoColor=ffffff"> <img src="https://img.shields.io/static/v1?label=&color=%23000000&message=JSON Web Tokens&logo=JSON Web Tokens&style=flat-square&logoColor=ffffff"> <img src="https://img.shields.io/static/v1?label=&color=%235A29E4&message=Axios&logo=Axios&style=flat-square&logoColor=ffffff">

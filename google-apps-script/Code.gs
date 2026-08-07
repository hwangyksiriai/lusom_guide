/**
 * 루솜 캠페인 신청 폼 → 구글시트 연동 스크립트
 *
 * [배포 방법]
 * 1. 대상 구글시트(스프레드시트)를 엽니다.
 *    https://docs.google.com/spreadsheets/d/1nXtNCrNQnfmWCB2WyKlzquxaoAv0wbdwo6R-4xqnrsE/edit
 * 2. 상단 메뉴 "확장 프로그램 > Apps Script" 클릭
 * 3. 기본 생성된 코드를 모두 지우고 이 파일 내용을 붙여넣기
 * 4. 저장 (Ctrl+S)
 * 5. 우측 상단 "배포 > 새 배포" 클릭
 *    - 유형 선택: "웹 앱"
 *    - 실행 계정: 나(본인 계정)
 *    - 액세스 권한이 있는 사용자: 전체
 *    - "배포" 클릭 → 액세스 승인 (본인 계정으로 로그인)
 * 6. 배포 완료 후 나오는 "웹 앱 URL"을 복사
 * 7. 루솜 사이트의 각 페이지(index.html, b.html~f.html) 안에서
 *    const GAS_WEB_APP_URL = 'YOUR_WEB_APP_URL_HERE';
 *    이 부분의 'YOUR_WEB_APP_URL_HERE'를 방금 복사한 URL로 교체
 *
 * [동작 방식]
 * - 모든 신청은 탭을 나누지 않고 하나의 시트("신청내역")에 쌓입니다.
 * - 각 페이지(Type A~F)가 보낸 타입(tier)·고료(price)가 행마다 컬럼으로 기록되어,
 *   같은 탭 안에서 고료별로 필터링/정렬만 하면 구분해서 볼 수 있습니다.
 * - 우편번호·휴대폰 컬럼은 항상 텍스트 서식으로 저장되어 앞자리 0이 보존됩니다.
 *
 * [코드를 수정할 때 다시 배포하는 법]
 * "배포 > 배포 관리" → 연필 아이콘 → 버전 "새 버전" 선택 → 배포
 * (URL은 그대로 유지되므로 사이트 쪽 코드는 다시 바꿀 필요 없음)
 */

var SHEET_NAME = '신청내역';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tier = (data.tier || '기타').toString();
    var price = (data.price || '미지정').toString();

    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['제출일시', '타입', '고료', '이름', '인스타그램', '휴대폰', '이메일', '우편번호', '주소', '요청사항']);
      sheet.getRange('A1:J1').setFontWeight('bold');
      sheet.setFrozenRows(1);
      // 휴대폰(F열)·우편번호(H열)은 항상 텍스트로 저장 (앞자리 0 보존)
      sheet.getRange('F2:F').setNumberFormat('@');
      sheet.getRange('H2:H').setNumberFormat('@');
    }

    var row = [
      new Date(),
      tier,
      price,
      data.name || '',
      data.instagram || '',
      "'" + (data.phone || '').toString(),
      data.email || '',
      "'" + (data.zipcode || '').toString(),
      data.address || '',
      data.note || ''
    ];
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: '루솜 캠페인 신청 웹훅이 정상 동작 중입니다.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

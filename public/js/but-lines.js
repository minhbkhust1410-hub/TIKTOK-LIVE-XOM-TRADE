export const BUT_CONTACT_DISPLAY = 'Ở phần Bio';

export const BUT_REWARD_LINES = [
  'Ồ hó! Vì sao con khóc? Lại gồng lỗ hay mất cả mớ tiền phí sàn rồi hả? Làm hoàn phí đi cho nhẹ ví, nhớ liên hệ ở bio nha con!',
  'Làm sao con khóc dữ vậy? Vừa chốt được vài pip đã bị phí giao dịch gặm sạch hả? Liên hệ ở bio để Bụt làm hoàn phí ngay, cứu từng xu một!',
  'Thôi nín đi con! Lệnh sai thì cắt lỗ chứ đừng để phí sàn ăn oan uổng! Muốn làm hoàn phí thì ghé phần bio liên hệ Bụt nhé!',
  'Bụt đi tuần Xóm Trade thấy anh em cày volume sung quá mà quên lấy lại tiền! Nhớ làm hoàn phí nha, cứ vào bio liên hệ là gặp Bụt!',
  'Tích tiểu thành đại, thị trường chưa biết thắng thua chứ hoàn phí là chắc kèo tiền về túi! Anh em cần làm hoàn phí thì liên hệ ở bio nhé!',
  'Nến hôm nay quét râu ác thật, may mà có tiền hoàn phí an ủi trái tim trader! Ai chưa cài thì ghé bio liên hệ Bụt ngay nha!',
  'Chào cả xóm! Dù phe Bò hay phe Gấu thắng, xong vòng kéo co nhớ nhận hoàn phí cho đỡ xót phí sàn nha, thông tin liên hệ ở bio!',
  'Bụt không cứu được lệnh con lỡ nhồi quá tay đâu, nhưng Bụt hoàn lại được tiền phí giao dịch cho con! Làm hoàn phí cứ liên hệ ở bio nha!',
  'Lời có thể chốt non, chứ phí sàn mà không lấy hoàn phí là có lỗi với cái ví lắm đó! Vào bio liên hệ Bụt để được lo từ A tới Z!',
  'Ê khoan! Soi nến căng quá coi chừng mỏi mắt! Nghỉ tay làm cái hoàn phí lấy lại tiền giao dịch đi con, hướng dẫn liên hệ ở ngay bio nhé!',
  'Ta là Ông Bụt chuyên giải cứu ví tiền trader! Vào lệnh đều tay mà chưa bật hoàn phí là phí của giời, nhắn ở bio ta bày cho!',
  'Hiện lên nhắc nhẹ cả xóm: trade chăm chỉ đừng quên hoàn phí nhé! Cứ bấm vào phần bio liên hệ để nhận lộc về ví!',
  'Phép màu không tự nhiên sinh ra, nhưng tiền hoàn phí thì tự về nếu con chịu khó ghé bio liên hệ với Ông Bụt!',
  'Bụt ghé ngang hỏi thăm: hôm nay gặt được mấy cây nến xanh rồi? Nhớ nhận hoàn phí nha, cần hỗ trợ cứ liên hệ ở bio!',
  'Gió đưa cành trúc la đà, muốn làm hoàn phí cứ vào bio nha! Ông Bụt chúc cả xóm nến xanh rực rỡ!'
];

/**
 * Normalize text for natural Vietnamese TTS pronunciation.
 */
export function formatButSpeechText(displayText) {
  return String(displayText || '')
    .replace(/\bA tới Z\b/g, 'A đến Z');
}

/**
 * Pick a randomized Bụt line without repeating the immediately previous index.
 */
export function pickButAppearance({ index = null, lastIndex = -1, text = '', speechText = '' } = {}) {
  const customText = typeof text === 'string' && text.trim() ? text.trim().slice(0, 260) : '';
  if (customText) {
    return {
      index: -1,
      text: customText,
      speechText: (typeof speechText === 'string' && speechText.trim()) || formatButSpeechText(customText),
      contact: BUT_CONTACT_DISPLAY
    };
  }
  let chosen = Number.isInteger(index) && index >= 0 && index < BUT_REWARD_LINES.length ? index : -1;
  if (chosen < 0) {
    const candidates = BUT_REWARD_LINES.map((_, i) => i).filter(i => i !== lastIndex);
    const pool = candidates.length ? candidates : [0];
    chosen = pool[Math.floor(Math.random() * pool.length)];
  }
  const display = BUT_REWARD_LINES[chosen];
  return {
    index: chosen,
    text: display,
    speechText: (typeof speechText === 'string' && speechText.trim()) || formatButSpeechText(display),
    contact: BUT_CONTACT_DISPLAY
  };
}

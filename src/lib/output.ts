/**
 * 輸出服務
 * 統一封裝 console 輸出，便於測試與維護
 */

export class OutputService {
  /**
   * 輸出到 stdout
   */
  print(message: string): void {
    console.log(message);
  }

  /**
   * 輸出錯誤到 stderr（帶 "錯誤:" 前綴）
   */
  error(message: string): void {
    console.error(`錯誤: ${message}`);
  }

  /**
   * 輸出原始錯誤到 stderr（無前綴）
   */
  errorRaw(message: string): void {
    console.error(message);
  }

  /**
   * 輸出成功訊息
   */
  success(message: string): void {
    console.log(message);
  }
}

// 全域單例
export const output = new OutputService();

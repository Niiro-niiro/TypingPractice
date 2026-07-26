import React, { useState, useEffect, useRef } from "react";
import Hangul from "hangul-js";
import "./App.css";

// 💡 긴 문장을 화면 크기에 맞게(기본 35자) 절반 부근 공백 기준으로 나누는 헬퍼 함수
const splitLongLines = (lines, maxLength = 35) => {
  const result = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 설정한 길이보다 길면 절반으로 분할
    if (trimmed.length > maxLength) {
      const mid = Math.floor(trimmed.length / 2);

      // 1. 중간 지점 기준 뒤쪽의 첫 공백 찾기
      let splitIdx = trimmed.indexOf(" ", mid);

      // 2. 뒤쪽에 공백이 없으면 앞쪽의 공백 찾기
      if (splitIdx === -1) {
        splitIdx = trimmed.lastIndexOf(" ", mid);
      }

      // 3. 공백이 아예 없는 긴 단어면 그냥 중간 지점에서 강제 분할
      if (splitIdx === -1) {
        splitIdx = mid;
      }

      const firstHalf = trimmed.slice(0, splitIdx).trim();
      const secondHalf = trimmed.slice(splitIdx).trim();

      if (firstHalf) result.push(firstHalf);
      
      // 잘라낸 뒷부분이 여전히 길 경우 재귀적으로 추가 분할
      if (secondHalf) {
        result.push(...splitLongLines([secondHalf], maxLength));
      }
    } else {
      result.push(trimmed);
    }
  });

  return result;
};

export default function App() {
  const [textData, setTextData] = useState([
    "태초에 하나님이 천지를 창조하시니라",
    "그 땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라",
    "하나님이 이르시되 빛이 있으라 하시니 빛이 있었고",
    "그 빛이 하나님이 보시기에 좋았더라 하나님이 빛과 어둠을 나누사"
  ]);

  const [fileName, setFileName] = useState("기본 텍스트");

  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [input, setInput] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracyList, setAccuracyList] = useState([]);
  const [totalWrongCount, setTotalWrongCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [isComposing, setIsComposing] = useState(false);
  const [wrongIndices, setWrongIndices] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentTargetText = textData[currentLineIdx] || "";
  const totalAccuracy = accuracyList.length > 0 ? Math.round(accuracyList.reduce((a, b) => a + b, 0) / accuracyList.length) : 100;
  
  // 총 글자 수 계산
  const totalChars = textData.reduce((acc, cur) => acc + cur.length, 0);

  // 💡 .txt 파일 업로드 및 데이터 파싱 처리
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".txt")) {
      alert(".txt 확장자의 텍스트 파일만 업로드할 수 있습니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      
      // 줄바꿈 기준으로 분할하고, 공백 줄 제외
      const rawLines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (rawLines.length === 0) {
        alert("파일에 불러올 수 있는 텍스트 내용이 없습니다.");
        return;
      }

      // 🔥 긴 문장 자동 분할 처리 (35자 기준)
      const processedLines = splitLongLines(rawLines, 35);

      // 상태 초기화 및 데이터 세팅
      setTextData(processedLines);
      setFileName(file.name);
      setCurrentLineIdx(0);
      setInput("");
      setWrongIndices(new Set());
      setIsFinished(false);
      setIsStarted(false);
      setElapsedSeconds(0);
      setTotalKeystrokes(0);
      setCpm(0);
      setAccuracyList([]);
      setTotalWrongCount(0);
    };

    reader.readAsText(file, "UTF-8");
    e.target.value = ""; // 동일한 파일을 다시 선택해도 인식되도록 초기화
  };

  useEffect(() => {
    if (isStarted && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const nextSec = prev + 1;
          const cpmValue = Math.round((totalKeystrokes / (nextSec / 60)));
          setCpm(isNaN(cpmValue) ? 0 : cpmValue);
          return nextSec;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isStarted, isFinished, totalKeystrokes]);

  const progress = Math.round(((currentLineIdx) / textData.length) * 100);

  const getPhysicalKey = (code) => {
    if (code.startsWith('Key')) return code.replace('Key', '').toLowerCase();
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    return code.toLowerCase();
  };

  const renderTargetText = () => {
    return currentTargetText.split('').map((char, i) => {
      const isWrong = wrongIndices.has(i);
      const isPassed = i < input.length;

      let className = "";
      if (isWrong) {
        className = "char-wrong";
      } else if (isPassed) {
        className = "char-correct";
      } else if (i === input.length) {
        className = "char-pending";
      } else {
        className = "char-future";
      }
      
      return <span key={i} className={className}>{char}</span>;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") e.preventDefault();
    
    const physicalKey = getPhysicalKey(e.code);
    setActiveKeys((prev) => new Set(prev).add(physicalKey));

    if (e.code === "Enter") {
      e.preventDefault();
      
      if (isProcessing) return;
      setIsProcessing(true);
      
      if (isComposing) {
        setIsComposing(false);
      }

      setTimeout(() => {
        if (input.length === 0) {
          setIsProcessing(false);
          return;
        }

        const inputDisassembled = Hangul.disassemble(input);
        const targetDisassembled = Hangul.disassemble(currentTargetText);
        const isCorrect = inputDisassembled.length === targetDisassembled.length && 
                          inputDisassembled.every((l, i) => l === targetDisassembled[i]);

        if (!isCorrect) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 400);
          setIsProcessing(false);
          return;
        }

        let correctCount = 0;
        input.split("").forEach((char, index) => {
          if (char === currentTargetText[index]) correctCount++;
        });
        const lineAccuracy = Math.round((correctCount / currentTargetText.length) * 100);

        setAccuracyList((prev) => [...prev, lineAccuracy]);
        setTotalKeystrokes((prev) => prev + inputDisassembled.length);
        setWrongIndices(new Set());

        if (currentLineIdx < textData.length - 1) {
          setInput(""); 
          setCurrentLineIdx((prev) => prev + 1);
          if (inputRef.current) inputRef.current.value = "";
          setIsProcessing(false);
        } else {
          setIsFinished(true);
          setIsStarted(false);
          setIsProcessing(false);
        }
      }, 0);
      
      return; 
    }
  };

  const handleKeyUp = (e) => {
    const physicalKey = getPhysicalKey(e.code);
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(physicalKey);
      return next;
    });
  };

  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    const completedWord = e.target.value;
    const lastIdx = completedWord.length - 1;

    if (lastIdx >= 0 && lastIdx < currentTargetText.length) {
      if (completedWord[lastIdx] !== currentTargetText[lastIdx]) {
        setTotalWrongCount((prev) => prev + 1);
        setWrongIndices((prev) => new Set([...prev, lastIdx]));
      }
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const oldLength = input.length;
    const newLength = newValue.length;

    if (newLength < oldLength) {
      const deletedIdx = newLength;
      if (wrongIndices.has(deletedIdx)) {
        setTotalWrongCount((prev) => Math.max(0, prev - 1));
        setWrongIndices((prev) => {
          const next = new Set(prev);
          next.delete(deletedIdx);
          return next;
        });
      }
    }
 
    setInput(newValue);
    if (!isStarted) setIsStarted(true);
  };

  useEffect(() => {
    setInput("");
    setWrongIndices(new Set());
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentLineIdx]);

  const keyClass = (keyToken) => activeKeys.has(keyToken.toLowerCase()) ? "pressed" : "";

  return (
    <div className="app-container">
      <div className="top-menu-bar">
        <div className="menu-left">타자 연습 프로그램</div>
        <div className="menu-right">
          <span>타수: <strong>{cpm}</strong></span>
          <span>오타율: <strong>{isNaN(totalWrongCount) ? 0 : totalWrongCount}%</strong></span>
          <span>진행도: <strong>{progress}%</strong></span>
        </div>
      </div>

      <div className="main-content">
        {/* 왼쪽 사이드바: txt 파일 업로드 및 파일 정보 박스 */}
        {!isFinished && (
          <div className="sidebar-box">
            <h3 className="sidebar-title">글 업로드</h3>
            
            <label className="file-upload-button">
              .txt 파일 불러오기
              <input 
                type="file" 
                accept=".txt" 
                onChange={handleFileUpload} 
                style={{ display: "none" }}
              />
            </label>
            
            <div className="file-info-container">
              <div className="info-item">
                <span className="info-label">파일명:</span>
                <span className="info-value file-name" title={fileName}>{fileName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">총 줄 수:</span>
                <span className="info-value">{textData.length.toLocaleString()} 줄</span>
              </div>
              <div className="info-item">
                <span className="info-label">총 글자 수:</span>
                <span className="info-value">{totalChars.toLocaleString()} 자</span>
              </div>
              <div className="info-item">
                <span className="info-label">현재 문장:</span>
                <span className="info-value">{currentLineIdx + 1} / {textData.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* 오른쪽 메인 워크스페이스: 타자 연습 영역 */}
        <div className="workspace">
          {isFinished ? (
            <div className="result-box">
              {/* CSS 폭죽 애니메이션 조각들 */}
              <div className="confetti-wrapper">
                <span className="confetti c1"></span>
                <span className="confetti c2"></span>
                <span className="confetti c3"></span>
                <span className="confetti c4"></span>
                <span className="confetti c5"></span>
                <span className="confetti c6"></span>
                <span className="confetti c7"></span>
                <span className="confetti c8"></span>
                <span className="confetti c9"></span>
                <span className="confetti c10"></span>
                <span className="confetti c11"></span>
                <span className="confetti c12"></span>
              </div>

              <h2 className="result-title">🎉 타자 연습 완료!</h2>
              
              <div className="result-stats">
                <div className="stat-card">
                  <span className="stat-label">평균 속도</span>
                  <span className="stat-value">{cpm} <small>타</small></span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">최종 정확도</span>
                  <span className="stat-value">{totalAccuracy}%</span>
                </div>
              </div>

              <button className="restart-button" onClick={() => window.location.reload()}>
                다시 하기
              </button>
            </div>
          ) : (
            <>
              <div className="text-window">
                {textData.map((line, idx) => (
                  <div key={idx} className={`text-line ${idx === currentLineIdx ? "active" : ""}`}>
                    {idx === currentLineIdx ? renderTargetText() : line}
                  </div>
                ))}
              </div>
              <input 
                ref={inputRef} 
                key={currentLineIdx}
                className={`input-box ${isShaking ? "shake" : ""}`} 
                value={input}
                autoComplete="off"
                spellCheck="false"
                onChange={handleInputChange}
                onKeyDown={handleKeyDown} 
                onKeyUp={handleKeyUp}
                onCompositionStart={() => setIsComposing(true)} 
                onCompositionEnd={handleCompositionEnd}
              />
              <div className="keyboard-panel">
                <div className="keyboard-row">
                  <button className={keyClass("`")}>`</button><button className={keyClass("1")}>1</button><button className={keyClass("2")}>2</button><button className={keyClass("3")}>3</button><button className={keyClass("4")}>4</button><button className={keyClass("5")}>5</button><button className={keyClass("6")}>6</button><button className={keyClass("7")}>7</button><button className={keyClass("8")}>8</button><button className={keyClass("9")}>9</button><button className={keyClass("0")}>0</button><button className={keyClass("-")}>-</button><button className={keyClass("=")}>=</button><button className={`k-back ${keyClass("backspace")}`}>Back</button>
                </div>
                <div className="keyboard-row">
                  <button className={`k-tab ${keyClass("tab")}`}>Tab</button><button className={keyClass("q")}>ㅂ</button><button className={keyClass("w")}>ㅈ</button><button className={keyClass("e")}>ㄷ</button><button className={keyClass("r")}>ㄱ</button><button className={keyClass("t")}>ㅅ</button><button className={keyClass("y")}>ㅛ</button><button className={keyClass("u")}>ㅕ</button><button className={keyClass("i")}>ㅑ</button><button className={keyClass("o")}>ㅐ</button><button className={keyClass("p")}>ㅔ</button><button className={keyClass("[")}>[</button><button className={keyClass("]")}>]</button><button className={keyClass("\\")}>\</button>
                </div>
                <div className="keyboard-row">
                  <button className={`k-cap ${keyClass("capslock")}`}>Caps</button><button className={keyClass("a")}>ㅁ</button><button className={keyClass("s")}>ㄴ</button><button className={keyClass("d")}>ㅇ</button><button className={keyClass("f")}>ㄹ</button><button className={keyClass("g")}>ㅎ</button><button className={keyClass("h")}>ㅗ</button><button className={keyClass("j")}>ㅓ</button><button className={keyClass("k")}>ㅏ</button><button className={keyClass("l")}>ㅣ</button><button className={keyClass(";")}>;</button><button className={keyClass("'")}>'</button><button className={`k-enter ${keyClass("enter")}`}>Enter</button>
                </div>
                <div className="keyboard-row">
                  <button className={`k-shift ${keyClass("shift")}`}>Shift</button><button className={keyClass("z")}>ㅋ</button><button className={keyClass("x")}>ㅌ</button><button className={keyClass("c")}>ㅊ</button><button className={keyClass("v")}>ㅍ</button><button className={keyClass("b")}>ㅠ</button><button className={keyClass("n")}>ㅜ</button><button className={keyClass("m")}>ㅡ</button><button className={keyClass(",")}>,</button><button className={keyClass(".")}>.</button><button className={keyClass("/")}>/</button><button className={`k-shift ${keyClass("shift")}`}>Shift</button>
                </div>
                <div className="keyboard-row">
                  <button className={`k-mod ${keyClass("control")}`}>Ctrl</button><button className={`k-mod ${keyClass("alt")}`}>Alt</button><button className={`k-space ${keyClass(" ")}`}>Space</button><button className={`k-mod ${keyClass("alt")}`}>Alt</button><button className={`k-mod ${keyClass("control")}`}>Ctrl</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
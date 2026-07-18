import React, { useState, useEffect, useRef } from "react";
import Hangul from "hangul-js";
import "./App.css";

const DEFAULT_SAMPLE = [
  "태초에 하나님이 천지를 창조하시니라",
  "그 땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의 영은 수면 위에 운행하시니라",
  "하나님이 이르시되 빛이 있으라 하시니 빛이 있었고",
  "그 빛이 하나님이 보시기에 좋았더라 하나님이 빛과 어둠을 나누사"
];

const BACKGROUND_IMAGES = [
  "/resource/background/bg1.jpg",
  "/resource/background/bg2.jpg",
  "/resource/background/bg3.jpg",
  "/resource/background/bg4.jpg",
];

export default function App() {
  const codeToKeyMap = {
  'KeyQ': 'q', 'KeyW': 'w', 'KeyE': 'e', 'KeyR': 'r', 'KeyT': 't',
  'KeyY': 'y', 'KeyU': 'u', 'KeyI': 'i', 'KeyO': 'o', 'KeyP': 'p',
  'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd', 'KeyF': 'f', 'KeyG': 'g',
  'KeyH': 'h', 'KeyJ': 'j', 'KeyK': 'k', 'KeyL': 'l',
  'KeyZ': 'z', 'KeyX': 'x', 'KeyC': 'c', 'KeyV': 'v', 'KeyB': 'b', 'KeyN': 'n', 'KeyM': 'm'
  };

  const [textData] = useState(DEFAULT_SAMPLE);
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
  const [bgIndex, setBgIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const [wrongIndices, setWrongIndices] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentTargetText = textData[currentLineIdx] || "";
  const totalAccuracy = accuracyList.length > 0 ? Math.round(accuracyList.reduce((a, b) => a + b, 0) / accuracyList.length) : 100;

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prevIdx) => (prevIdx + 1) % BACKGROUND_IMAGES.length);
    }, 15000);
    return () => clearInterval(bgTimer);
  }, []);

  useEffect(() => {
    if (isStarted && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        const cpmValue = Math.round((totalKeystrokes / ((elapsedSeconds + 1) / 60)));
        setCpm(isNaN(cpmValue) ? 0 : cpmValue);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isStarted, isFinished, totalKeystrokes, elapsedSeconds]);

  
  const progress = Math.round(((currentLineIdx) / textData.length) * 100);

const getPhysicalKey = (code) => {
    if (code.startsWith('Key')) return code.replace('Key', '').toLowerCase();
    if (code.startsWith('Digit')) return code.replace('Digit', '');
    return code.toLowerCase(); // Enter, Space, Backspace 등
  };

  const renderTargetText = () => {
    return currentTargetText.split('').map((char, i) => {
      // 오타 여부 판별
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
    // 1. 기본 키보드 이벤트 무시 처리
    if (e.key === "Tab") e.preventDefault();
    
    // 2. 키보드 시각 효과 처리
    const physicalKey = getPhysicalKey(e.code);
    setActiveKeys((prev) => new Set(prev).add(physicalKey));

    // 3. 엔터 처리 로직 (중복 입력 방지 및 비동기 처리)
    if (e.code === "Enter") {
      e.preventDefault();
      
      // 이미 처리 중이면 아무것도 하지 않음 (두 줄 넘김 방지)
      if (isProcessing) return;
      
      setIsProcessing(true); // [락 활성화]
      
      // 조합 중이라면 종료 처리
      if (isComposing) {
        setIsComposing(false);
      }

      // [핵심] 리액트가 마지막 글자를 input 상태에 반영할 시간을 줌
      setTimeout(() => {
        // 처리 시작 후 조건이 안 맞으면 다시 락을 풀어야 함
        if (input.length === 0) {
          setIsProcessing(false);
          return;
        }

        // 분해 비교를 통한 검증
        const inputDisassembled = Hangul.disassemble(input);
        const targetDisassembled = Hangul.disassemble(currentTargetText);
        const isCorrect = inputDisassembled.length === targetDisassembled.length && 
                          inputDisassembled.every((l, i) => l === targetDisassembled[i]);

        // 오타가 있을 경우 흔들림 효과 (실패 시 락 해제)
        if (!isCorrect) {
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 400);
          setIsProcessing(false); // [락 해제]
          return;
        }

        // 정확도 계산 및 상태 업데이트
        let correctCount = 0;
        input.split("").forEach((char, index) => {
          if (char === currentTargetText[index]) correctCount++;
        });
        const lineAccuracy = Math.round((correctCount / currentTargetText.length) * 100);

        setAccuracyList((prev) => [...prev, lineAccuracy]);
        setTotalKeystrokes((prev) => prev + inputDisassembled.length);
        setWrongIndices(new Set()); // 오타 초기화

        // 줄 넘김 처리
        if (currentLineIdx < textData.length - 1) {
          setInput(""); 
          setCurrentLineIdx((prev) => prev + 1);
          if (inputRef.current) inputRef.current.value = "";
          
          // 줄이 바뀌었으므로 락 해제
          setIsProcessing(false);
        } else {
          setIsFinished(true);
          setIsStarted(false);
          // 종료 시에도 락 해제
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
    const completedWord = e.target.value; // 완성된 텍스트
    const lastIdx = completedWord.length - 1; // 방금 완성된 글자의 인덱스

    // 방금 완성된 글자가 정답과 다른지 확인
    if (lastIdx >= 0 && lastIdx < currentTargetText.length) {
      if (completedWord[lastIdx] !== currentTargetText[lastIdx]) {
        console.log("오타 적립 성공! 위치:", lastIdx);
        setTotalWrongCount((prev) => prev + 1);
        setWrongIndices((prev) => new Set([...prev, lastIdx]));
      }
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const oldLength = input.length;
    const newLength = newValue.length;

    // 1. 글자가 지워졌을 때 (Backspace)
    if (newLength < oldLength) {
      const deletedIdx = newLength; // 지워진 자리의 인덱스
      
      // 지워진 자리가 오타 리스트에 있었다면?
      if (wrongIndices.has(deletedIdx)) {
        console.log("오타 복구! 인덱스:", deletedIdx);
        
        // 오타 카운트 차감
        setTotalWrongCount((prev) => Math.max(0, prev - 1));
        
        // 오타 리스트에서 제거
        setWrongIndices((prev) => {
          const next = new Set(prev);
          next.delete(deletedIdx);
          return next;
        });
      }
    }

  // 2. 글자가 추가되었을 때 (이미 있는 onCompositionEnd 로직과 병행)
  // ... 여기는 기존처럼 입력만 담당 ...
  
  setInput(newValue);
  if (!isStarted) setIsStarted(true);
};

  useEffect(() => {
    setInput(""); // 1. 입력창 비움
    setWrongIndices(new Set()); // 2. 오타 정보도 초기화
    
    // 3. 강제 포커스
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentLineIdx]);

  const keyClass = (keyToken) => activeKeys.has(keyToken.toLowerCase()) ? "pressed" : "";

  return (
    <div className="app-container">
      <div className="top-menu-bar">
        <div className="menu-left">타자 연습</div>
        <div className="menu-right">
          <span>타수: <strong>{cpm}</strong></span>
          <span>오타율: <strong>{isNaN(totalWrongCount) ? 0 : totalWrongCount}%</strong></span>
          <span>진행도: <strong>{progress}%</strong></span>
        </div>
      </div>
      <div className="bg-slider-container">
        {BACKGROUND_IMAGES.map((src, idx) => (
          <div key={idx} className={`bg-image-layer ${idx === bgIndex ? "active" : ""}`} style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>

      <div className="main-content">
        {isFinished ? (
          <div className="result-box">
            <h2> 타자 연습 완료!</h2>
            <p>평균 속도: <strong>{cpm} 타</strong></p>
            <p>최종 정확도: <strong>{totalAccuracy}%</strong></p>
            <button onClick={() => window.location.reload()}>다시 하기</button>
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
                <button className={`k-tab ${keyClass("tab")}`}>Tab</button><button className={keyClass("q")}>ㅂ</button><button className={keyClass("w")}>ㅈ</button><button className={keyClass("e")}>ㄷ</button><button className={keyClass("r")}>ㄱ</button><button className={keyClass("t")}>ㅛ</button><button className={keyClass("y")}>ㅛ</button><button className={keyClass("u")}>ㅕ</button><button className={keyClass("i")}>ㅑ</button><button className={keyClass("o")}>ㅐ</button><button className={keyClass("p")}>ㅔ</button><button className={keyClass("[")}>[</button><button className={keyClass("]")}>]</button><button className={keyClass("\\")}>\</button>
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
  );
}
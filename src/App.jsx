import React, { useState, useEffect, useRef } from "react";
import Hangul from "hangul-js";
import "./App.css";

const DEFAULT_SAMPLE = [
  "드넓은 저 우주를 한없이 맴도는 행성을 스쳐가며",
  "지나왔던 우리 흔적들은 저 별들이 따라갈 앞길이 될 거야",
  "망설이는 너의 그 마음을 이끌어 주고 싶어",
  "소중하게 품어온 꿈들을 이어주는 유성우"
];

const BACKGROUND_IMAGES = [
  "/resource/background/bg1.jpg",
  "/resource/background/bg2.jpg",
  "/resource/background/bg3.jpg",
  "/resource/background/bg4.jpg",
];

export default function App() {
  // 매핑 테이블을 컴포넌트 상단으로 이동
  const hangulToEngMap = {
    'ㅂ': 'q', 'ㅈ': 'w', 'ㄷ': 'e', 'ㄱ': 'r', 'ㅅ': 't', 
    'ㅛ': 'y', 'ㅕ': 'u', 'ㅑ': 'i', 'ㅐ': 'o', 'ㅔ': 'p',
    'ㅁ': 'a', 'ㄴ': 's', 'ㅇ': 'd', 'ㄹ': 'f', 'ㅎ': 'g', 
    'ㅗ': 'h', 'ㅓ': 'j', 'ㅏ': 'k', 'ㅣ': 'l',
    'ㅋ': 'z', 'ㅌ': 'x', 'ㅊ': 'c', 'ㅍ': 'v', 'ㅠ': 'b', 'ㅜ': 'n', 'ㅡ': 'm'
  };

  const [textData, setTextData] = useState(DEFAULT_SAMPLE);
  const [fileName, setFileName] = useState("유성우-StelLive Cliché");
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [input, setInput] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracyList, setAccuracyList] = useState([]); 
  const [wrongCount, setWrongCount] = useState(0); 
  const [isFinished, setIsFinished] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [bgIndex, setBgIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);

  const inputRef = useRef(null);
  const lineRefs = useRef([]);
  const timerRef = useRef(null);

  const currentTargetText = textData[currentLineIdx] || "";

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prevIdx) => (prevIdx + 1) % BACKGROUND_IMAGES.length);
    }, 15000);
    return () => clearInterval(bgTimer);
  }, []);

  useEffect(() => {
    if (isStarted && elapsedSeconds > 0) {
      // 타수 공식: (총 입력 자소 수 / 경과 시간(분))
      const cpmValue = Math.round((totalKeystrokes / (elapsedSeconds / 60)));
      setCpm(isNaN(cpmValue) ? 0 : cpmValue);
    }
  }, [totalKeystrokes, elapsedSeconds, isStarted]);

  useEffect(() => {
    if (isStarted && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isStarted, isFinished]);

  useEffect(() => {
    if (lineRefs.current[currentLineIdx]) {
      lineRefs.current[currentLineIdx].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentLineIdx, textData]);

  const handleKeyDown = (e) => {
    if (e.key === "Tab") e.preventDefault();

    let keyKey = e.key.toLowerCase();
    if (hangulToEngMap[e.key]) keyKey = hangulToEngMap[e.key];
    setActiveKeys((prev) => new Set(prev).add(keyKey));

    if (isComposing) return;
    
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.length === 0) return;

      const inputDisassembled = Hangul.disassemble(input);
      const targetDisassembled = Hangul.disassemble(currentTargetText);
      
      const isCorrect = inputDisassembled.length === targetDisassembled.length && 
                        inputDisassembled.every((letter, idx) => letter === targetDisassembled[idx]);

      if (!isCorrect) {
        setIsShaking(true);
        setWrongCount((prev) => prev + 1);
        setTimeout(() => setIsShaking(false), 400);
        return;
      }

      // 정답 로직
      let correctCount = 0;
      input.split("").forEach((char, index) => {
        if (char === currentTargetText[index]) correctCount++;
      });
      const lineAccuracy = Math.round((correctCount / currentTargetText.length) * 100);
      setAccuracyList([...accuracyList, lineAccuracy]);
      setTotalKeystrokes((prev) => prev + inputDisassembled.length);

      if (currentLineIdx < textData.length - 1) {
        setCurrentLineIdx((prev) => prev + 1);
        setInput(""); 
      } else {
        setIsFinished(true);
        setIsStarted(false);
      }
    }
  };

  const handleKeyUp = (e) => {
    let keyKey = e.key.toLowerCase();
    if (hangulToEngMap[e.key]) keyKey = hangulToEngMap[e.key];
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(keyKey);
      return next;
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    if (!isStarted && val.length > 0) {
    setIsStarted(true);
    setStartTime(Date.now()); // 시간 측정 시작
    }
    if (val.length > 0) {
      const inputDisassembled = Hangul.disassemble(val);
      const targetDisassembled = Hangul.disassemble(currentTargetText);
      const targetChunk = targetDisassembled.slice(0, inputDisassembled.length);
      if (inputDisassembled.some((letter, index) => letter !== targetChunk[index])) {
        setIsShaking(true);
        setWrongCount((prev) => prev + 1);
        setTimeout(() => setIsShaking(false), 400);
      }
    }
  };

  const resetPracticeState = () => {
    setCurrentLineIdx(0);
    setInput("");
    setIsStarted(false);
    setStartTime(null);
    setElapsedSeconds(0);
    setTotalKeystrokes(0);
    setCpm(0);
    setAccuracyList([]);
    setWrongCount(0);
    setIsFinished(false);
    setActiveKeys(new Set());
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const parsedLines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      setTextData(parsedLines);
      setFileName(file.name);
      resetPracticeState();
    };
    reader.readAsText(file, "UTF-8");
  };

  const totalAccuracy = accuracyList.length > 0 ? Math.round(accuracyList.reduce((a, b) => a + b, 0) / accuracyList.length) : 100;
  const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const keyClass = (keyToken) => {
  // 1. 영어 키 자체를 눌렀을 때
    if (activeKeys.has(keyToken)) return "pressed";
    
    // 2. 한글 키를 눌렀을 때 영어 키로 매핑해서 체크
    // (예: 'ㅂ'이 눌렸으면, 'q'가 pressed인지 확인)
    const hangulKey = Object.keys(hangulToEngMap).find(key => hangulToEngMap[key] === keyToken);
    if (hangulKey && activeKeys.has(hangulKey)) return "pressed";
    
    return "";
  };
  return (
    <div className="app-container">
      
      {/* 1. 배경 컴포넌트 (렌더링 강제 고정 구조) */}
      <div className="bg-slider-container">
        {BACKGROUND_IMAGES.map((src, idx) => {
          const isActive = idx === bgIndex;
          return (
            <div
              key={`bg-layer-${idx}`}
              className={`bg-image-layer ${isActive ? "active" : ""}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          );
        })}
      </div>

      {/* 2. LEFT SIDEBAR */}
      <div className="liquid-glass-panel sidebar">
        <div className="liquid-glass-effect"></div>
        <div className="liquid-glass-tint"></div>
        <div className="liquid-glass-shine"></div>
        <div className="liquid-glass-content">
          <h3 className="sidebar-title">장문연습</h3>
          
          <div className="stat-group">
            <div className="stat-header">⏱️ 진행 정보</div>
            <div className="stat-item">
              <span className="stat-lbl">진행시간</span>
              <span className="stat-val">{formatTime(elapsedSeconds)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-lbl">진행도</span>
              <span className="stat-val">{currentLineIdx + 1} / {textData.length}</span>
            </div>
          </div>

          <div className="stat-group">
            <div className="stat-header">📈 속도 및 정확도</div>
            <div className="stat-item">
              <span className="stat-lbl">타수(타/분)</span>
              <span className="stat-val">{cpm}</span>
            </div>
            <div className="stat-item">
              <span className="stat-lbl">정확도(%)</span>
              <span className="stat-val">{totalAccuracy}%</span>
            </div>
            <div className="accuracy-bar-bg">
              <div className="accuracy-bar-fill" style={{ width: `${totalAccuracy}%` }}></div>
            </div>
          </div>

          <div className="stat-group">
            <div className="stat-header">⚠️ 실시간 분석</div>
            <div className="stat-item">
              <span className="stat-lbl">누적 오타수</span>
              <span className="stat-val" style={{ color: wrongCount > 0 ? '#922b21' : '#0f2c1d' }}>{wrongCount}</span>
            </div>
          </div>

          <div className="sidebar-footer">
            문서 소스: <br /><strong>{fileName}</strong>
          </div>
        </div>
      </div>

      {/* 3. RIGHT MAIN CONTENT */}
      <div className="main-content">
        <div className="top-nav">
          <button className="btn-lang">한국어</button>
        </div>

        <div className="liquid-glass-panel upload-toolbar">
          <div className="liquid-glass-effect"></div>
          <div className="liquid-glass-tint"></div>
          <div className="liquid-glass-shine"></div>
          <div className="liquid-glass-content" style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#1e4630', fontWeight: 600 }}>커스텀 타자 파일 연동</span>
            <label htmlFor="txt-file" className="upload-btn-lbl">파일 업로드</label>
            <input type="file" id="txt-file" accept=".txt" onChange={handleFileUpload} style={{ display: "none" }} />
          </div>
        </div>

        {isFinished ? (
          <div className="liquid-glass-panel result-box">
            <div className="liquid-glass-effect"></div>
            <div className="liquid-glass-tint"></div>
            <div className="liquid-glass-shine"></div>
            <div className="liquid-glass-content">
              <h2>🎉 타자 연습 완료!</h2>
              <p>평균 속도: <strong>{cpm} 타</strong></p>
              <p>최종 정확도: <strong>{totalAccuracy}%</strong></p>
              <p>누적 오타: <strong style={{ color: '#922b21' }}>{wrongCount}회</strong></p>
              <button onClick={resetPracticeState} className="btn-lang" style={{ marginTop: '20px', padding: '10px 24px' }}>다시 하기</button>
            </div>
          </div>
        ) : (
          <>
            <div className="liquid-glass-panel text-window">
              <div className="liquid-glass-effect"></div>
              <div className="liquid-glass-tint"></div>
              <div className="liquid-glass-shine"></div>
              <div className="liquid-glass-content">
                {textData.map((line, lIdx) => {
                  const isCurrent = lIdx === currentLineIdx;
                  const isPassed = lIdx < currentLineIdx;
                  let lineClass = "text-line";
                  if (isCurrent) lineClass += " active";
                  if (isPassed) lineClass += " passed";

                  return (
                    <div key={lIdx} ref={(el) => (lineRefs.current[lIdx] = el)} className={lineClass}>
                      {isCurrent ? (
                        line.split("").map((char, cIdx) => {
                          let charClass = "";
                          if (cIdx < input.length) {
                            charClass = char === input[cIdx] ? "char-correct" : "char-incorrect";
                          }
                          return <span key={cIdx} className={charClass}>{char}</span>;
                        })
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              // [수정된 부분 시작]
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                // 글자 조합 중일 때는 엔터 로직이 실행되지 않게 막음
                if (e.key === "Enter" && isComposing) {
                  e.preventDefault();
                  return;
                }
                handleKeyDown(e);
              }}
              // [수정된 부분 끝]
              placeholder="하이라이트된 파스텔 그린 바의 문장을 입력한 후 엔터를 치세요."
              onKeyUp={handleKeyUp}
              className={`input-box ${isShaking ? "shake" : ""}`}
              autoFocus
            />

            {/* 가상 키보드 패널 */}
            <div className="liquid-glass-panel keyboard-panel">
              <div className="liquid-glass-effect"></div>
              <div className="liquid-glass-tint"></div>
              <div className="liquid-glass-shine"></div>
              <div className="liquid-glass-content">
                {/* Row 1 */}
                <div className="keyboard-row">
                  <button className={keyClass("~")}>~</button>
                  <button className={keyClass("1")}>1</button>
                  <button className={keyClass("2")}>2</button>
                  <button className={keyClass("3")}>3</button>
                  <button className={keyClass("4")}>4</button>
                  <button className={keyClass("5")}>5</button>
                  <button className={keyClass("6")}>6</button>
                  <button className={keyClass("7")}>7</button>
                  <button className={keyClass("8")}>8</button>
                  <button className={keyClass("9")}>9</button>
                  <button className={keyClass("0")}>0</button>
                  <button className={keyClass("-")}>-</button>
                  <button className={keyClass("=")}>=</button>
                  <button className={`k-back ${keyClass("backspace")}`}>Backspace</button>
                </div>
                {/* Row 2 */}
                <div className="keyboard-row">
                  <button className={`k-tab ${keyClass("tab")}`}>Tab</button>
                  <button className={keyClass("q")}>Q</button>
                  <button className={keyClass("w")}>W</button>
                  <button className={keyClass("e")}>E</button>
                  <button className={keyClass("r")}>R</button>
                  <button className={keyClass("t")}>T</button>
                  <button className={keyClass("y")}>Y</button>
                  <button className={keyClass("u")}>U</button>
                  <button className={keyClass("i")}>I</button>
                  <button className={keyClass("o")}>O</button>
                  <button className={keyClass("p")}>P</button>
                  <button className={keyClass("[")}>[</button>
                  <button className={keyClass("]")}>]</button>
                  <button className={keyClass("\\")}>\</button>
                </div>
                {/* Row 3 */}
                <div className="keyboard-row">
                  <button className={`k-cap ${keyClass("capslock")}`}>Caps</button>
                  <button className={keyClass("a")}>A</button>
                  <button className={keyClass("s")}>S</button>
                  <button className={keyClass("d")}>D</button>
                  <button className={keyClass("f")}>F</button>
                  <button className={keyClass("g")}>G</button>
                  <button className={keyClass("h")}>H</button>
                  <button className={keyClass("j")}>J</button>
                  <button className={keyClass("k")}>K</button>
                  <button className={keyClass("l")}>L</button>
                  <button className={keyClass(";")}>;</button>
                  <button className={keyClass("'")}>'</button>
                  <button className={`k-enter ${keyClass("enter")}`}>Enter</button>
                </div>
                {/* Row 4 */}
                <div className="keyboard-row">
                  <button className={`k-shift ${keyClass("shift")}`}>Shift</button>
                  <button className={keyClass("z")}>Z</button>
                  <button className={keyClass("x")}>X</button>
                  <button className={keyClass("c")}>C</button>
                  <button className={keyClass("v")}>V</button>
                  <button className={keyClass("b")}>B</button>
                  <button className={keyClass("n")}>N</button>
                  <button className={keyClass("m")}>M</button>
                  <button className={keyClass(",")}>,</button>
                  <button className={keyClass(".")}>.</button>
                  <button className={keyClass("/")}>/</button>
                  <button className={`k-shift ${keyClass("shift")}`}>Shift</button>
                </div>
                {/* Row 5 */}
                <div className="keyboard-row">
                  <button className={`k-mod ${keyClass("control")}`}>Ctrl</button>
                  <button className={`k-mod ${keyClass("alt")}`}>Alt</button>
                  <button className={`k-space ${keyClass(" ")}`}>Space</button>
                  <button className={`k-mod ${keyClass("alt")}`}>Alt</button>
                  <button className={`k-mod ${keyClass("control")}`}>Ctrl</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* SVG 왜곡 필터 */}
      <svg style={{ display: "none" }}>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.01" numOctaves="1" seed="5" result="turbulence" />
          <feComponentTransfer in="turbulence" result="mapped">
            <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
            <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
            <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
          </feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
            <fePointLight x="-200" y="-200" z="300" />
          </feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="30" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      
    </div>
  );
}
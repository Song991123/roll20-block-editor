/**
 * Roll20 sheet sandbox baseline CSS — string export.
 *
 * Anchor: docs/spec/25_roll20_baseline.md
 *
 * 본 string 은 동일 디렉터리의 `roll20_baseline.css` 의 reference copy.
 * Web Worker 안에서도 import 가능하도록 ?raw 같은 bundler 전용 import 를
 * 피하고 순수 string literal 로 박는다. CSS 파일 편집 시 양쪽 sync 필요.
 *
 * 출처 (D:\훙냥냥\마렌상\legacy-sheet-corpus 시트 고치기\roll20-base\):
 *   - base.css (Bootstrap 3.x + normalize.css v3.0.3)
 *   - charactersheet.css (Roll20 `.ui-dialog .charsheet ...` 룰)
 *
 * 시스템 specific 0.
 */

export const roll20BaselineCss = String.raw`
/* box-sizing reset (Bootstrap 3.x) */
.charsheet,
.charsheet *,
.charsheet *::before,
.charsheet *::after {
  -webkit-box-sizing: border-box;
     -moz-box-sizing: border-box;
          box-sizing: border-box;
}

/* body-equivalent (charsheet wrapper 가 body 역할) */
.charsheet {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.42857143;
  color: #333;
  background-color: #fff;
  padding: 10px;
}

/* normalize: form element 기본 (base.css L527~590) */
.charsheet button,
.charsheet input,
.charsheet optgroup,
.charsheet select,
.charsheet textarea {
  margin: 0;
  font: inherit;
  color: inherit;
}
.charsheet input,
.charsheet button,
.charsheet select,
.charsheet textarea {
  background-color: #fff;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}
.charsheet button { overflow: visible; }
.charsheet button, .charsheet select { text-transform: none; }
.charsheet button,
.charsheet input[type="button"],
.charsheet input[type="reset"],
.charsheet input[type="submit"] {
  -webkit-appearance: button;
  cursor: pointer;
}
.charsheet button[disabled],
.charsheet input[disabled] { cursor: default; }
.charsheet input { line-height: normal; }
.charsheet input[type="checkbox"],
.charsheet input[type="radio"] {
  -webkit-box-sizing: border-box;
     -moz-box-sizing: border-box;
          box-sizing: border-box;
  padding: 0;
  margin: 4px 0 0;
  line-height: normal;
}
.charsheet input[type="number"]::-webkit-inner-spin-button,
.charsheet input[type="number"]::-webkit-outer-spin-button { height: auto; }
.charsheet textarea { overflow: auto; }

/* Bootstrap-3 form-control 미니멀 근사 */
.charsheet input[type="text"],
.charsheet input[type="number"],
.charsheet input[type="email"],
.charsheet input[type="url"],
.charsheet input[type="search"],
.charsheet input[type="password"],
.charsheet input:not([type]),
.charsheet select,
.charsheet textarea {
  display: inline-block;
  padding: 6px 12px;
  font-size: 14px;
  line-height: 1.42857143;
  color: #555;
  background-color: #fff;
  background-image: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075);
          box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075);
  -webkit-transition: border-color ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;
       -o-transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;
          transition: border-color ease-in-out .15s, box-shadow ease-in-out .15s;
}
.charsheet textarea {
  min-height: 60px;
  resize: vertical;
}
.charsheet input[type="text"]:focus,
.charsheet input[type="number"]:focus,
.charsheet input:not([type]):focus,
.charsheet select:focus,
.charsheet textarea:focus {
  border-color: #66afe9;
  outline: 0;
  -webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075), 0 0 8px rgba(102, 175, 233, .6);
          box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075), 0 0 8px rgba(102, 175, 233, .6);
}

.charsheet input {
  height: auto;
  vertical-align: middle;
  -webkit-box-sizing: border-box;
     -moz-box-sizing: border-box;
          box-sizing: border-box;
}

/* charactersheet.css L279 — 핵심: number input 3.5em 좁은 박스 */
.charsheet input[type="number"] { width: 3.5em; }

.charsheet input[type="checkbox"],
.charsheet input[type="radio"] {
  width: auto;
  height: auto;
  margin: 4px 0 0;
}
.charsheet input[type="hidden"] { display: none; }

/* 버튼 (Bootstrap .btn) */
.charsheet button {
  display: inline-block;
  padding: 6px 12px;
  margin-bottom: 0;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.42857143;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  cursor: pointer;
  -webkit-user-select: none;
     -moz-user-select: none;
      -ms-user-select: none;
          user-select: none;
  background-color: #fff;
  background-image: none;
  border: 1px solid #ccc;
  border-radius: 4px;
  color: #333;
}
.charsheet button:hover,
.charsheet button:focus {
  background-color: #e6e6e6;
  border-color: #adadad;
  color: #333;
  text-decoration: none;
}
.charsheet button:active {
  background-image: none;
  outline: 0;
  -webkit-box-shadow: inset 0 3px 5px rgba(0, 0, 0, .125);
          box-shadow: inset 0 3px 5px rgba(0, 0, 0, .125);
}
.charsheet button:disabled,
.charsheet button[disabled] {
  cursor: not-allowed;
  opacity: .65;
  -webkit-box-shadow: none;
          box-shadow: none;
}

/* charactersheet.css L313 — roll / compendium 버튼 */
.charsheet button[type="roll"],
.charsheet button[type="compendium"] {
  padding: 2px 3px;
  font-size: 1.3em;
  margin: 0px 3px 0px 3px;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  color: #333;
}
.charsheet button[type="roll"]::before {
  content: "\1F3B2 ";
  font-family: inherit;
}
.charsheet button[type="compendium"]::before {
  content: "\24D8 ";
  font-family: inherit;
}

/* label (base.css L2932) */
.charsheet label {
  display: inline-block;
  max-width: 100%;
  margin-bottom: 5px;
  font-weight: bold;
}
.charsheet label input { display: inline-block; }
.charsheet label input[type="checkbox"] { display: inline-block; }

/* fieldset / legend */
.charsheet fieldset {
  padding: .35em .625em .75em;
  margin: 0 2px;
  border: 1px solid #c0c0c0;
  min-width: 0;
}
.charsheet legend {
  display: block;
  width: 100%;
  padding: 0;
  margin-bottom: 20px;
  font-size: 21px;
  line-height: inherit;
  color: #333;
  border: 0;
  border-bottom: 1px solid #e5e5e5;
}

/* heading */
.charsheet h1, .charsheet h2, .charsheet h3,
.charsheet h4, .charsheet h5, .charsheet h6 {
  font-family: inherit;
  font-weight: 500;
  line-height: 1.1;
  color: inherit;
  margin-top: 20px;
  margin-bottom: 10px;
}
.charsheet h1 { font-size: 36px; }
.charsheet h2 { font-size: 30px; }
.charsheet h3 { font-size: 24px; }
.charsheet h4 { font-size: 18px; }
.charsheet h5 { font-size: 14px; }
.charsheet h6 { font-size: 12px; }
.charsheet p { margin: 0 0 10px; }

/* link */
.charsheet a {
  color: #337ab7;
  text-decoration: none;
  background-color: transparent;
}
.charsheet a:hover, .charsheet a:focus {
  color: #23527c;
  text-decoration: underline;
}

/* img */
.charsheet img {
  border: 0;
  max-width: 100%;
  vertical-align: middle;
}

/* table */
.charsheet table {
  background-color: transparent;
  border-spacing: 0;
  border-collapse: collapse;
}
.charsheet th, .charsheet td {
  padding: 8px;
  line-height: 1.42857143;
  vertical-align: top;
  border-top: 1px solid #ddd;
  text-align: left;
}
.charsheet thead > tr > th {
  vertical-align: bottom;
  border-bottom: 2px solid #ddd;
}

/* hr */
.charsheet hr {
  clear: both;
  height: 0;
  margin-top: 20px;
  margin-bottom: 20px;
  border: 0;
  border-top: 1px solid #eee;
  -webkit-box-sizing: content-box;
     -moz-box-sizing: content-box;
          box-sizing: content-box;
}

/* Roll20 sheet-row / sheet-col 그리드 (charactersheet.css) */
.charsheet .sheet-row,
.charsheet .sheet-2colrow,
.charsheet .sheet-3colrow {
  display: block;
  clear: both;
}
.charsheet .sheet-col {
  display: inline-block;
  vertical-align: top;
}
.charsheet .sheet-col img { max-width: 100%; }
.charsheet .sheet-2colrow .sheet-col {
  width: calc(50% - 20px);
  margin-right: 30px;
}
.charsheet .sheet-3colrow .sheet-col {
  width: calc(33% - 21px);
  margin-right: 30px;
}
.charsheet .sheet-col:last-child { margin-right: 0 !important; }

/* repcontainer / repitem */
.charsheet .repcontainer .repitem {
  position: relative;
  -webkit-box-sizing: border-box;
     -moz-box-sizing: border-box;
          box-sizing: border-box;
}
.charsheet .repcontainer.editmode .repitem .itemcontrol { display: block; }
.charsheet .repitem.repitembroken { border: 1px solid red !important; }

/* rolltemplate / worker script — hide */
.charsheet rolltemplate,
.charsheet [class*="sheet-rolltemplate-"] { display: none; }
.charsheet script,
.charsheet script[type="text/worker"] { display: none; }

/* text helpers */
.charsheet b, .charsheet strong { font-weight: bold; }
.charsheet i, .charsheet em { font-style: italic; }
.charsheet code, .charsheet kbd, .charsheet pre, .charsheet samp {
  font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
  font-size: 90%;
}
.charsheet pre {
  display: block;
  padding: 9.5px;
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.42857143;
  color: #333;
  word-break: break-all;
  word-wrap: break-word;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 4px;
}
`;

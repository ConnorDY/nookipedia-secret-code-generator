/**
 * Creates the frontend for the PG password tools.
 * Created by Cuyler on Nookipedia (https://nookipedia.com/wiki/User:Cuyler)
 * Licensed under CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)
 **/

(function () {
  'use strict';

  const inputHTML = `
<fieldset id="maininputfield">
<legend>Input</legend>
<div id="inputDiv" style="float: left; margin-right: 20px;">
<h3>Code Type</h3>
<select name="codetype" id="codetype">
<option value="0">Famicom</option>
<option value="1">Popular</option>
<option value="2">CardE</option>
<option value="3">Magazine</option>
<option value="4" selected>User</option>
<option value="5">CardEMini</option>
</select>
<h3 id="str0">Player Name (String #1)</h3>
<canvas id="nameCanvas" style="width: 225px; height: 37.5px; display: block; background-color: rgb(255, 255, 255); margin-bottom: 5px; outline-width: 2px; outline-color: rgb(0, 0, 0); outline-style: solid;"></canvas>
<h3 id="str1">Town Name (String #2)</h3>
<canvas id="townCanvas" style="width: 225px; height: 37.5px; display: block; background-color: rgb(255, 255, 255); margin-bottom: 5px; outline-width: 2px; outline-color: rgb(0, 0, 0); outline-style: solid;"></canvas>
<h3 id="specialToggleHeader" style="display: none;">Special Villager</h3>
<input type="checkbox" id="specialToggle" name="specialToggle" style="display: none;" />
<h3 id="villagerHeader" style="display: none;">Villager</h3>
<select id="villagerSelect" style="display: none;"></select>
<h3 id="specialVillagerHeader" style="display: none;">Special Villager</h3>
<select id="specialVillagerSelect" style="display: none;"></select>
<h3 id="hitrateHeader" style="display: none;">Hit Rate (Win Rate)</h3>
<select id="hitrateSelect" style="display: none;">
<option value="3" selected>0%</option>
<option value="2">30%</option>
<option value="1">60%</option>
<option value="0">80%</option>
<option value="4">100%</option>
</select>
<h3 id="cardeHitrateHeader" style="display: none;">NES Present Chance</h3>
<select id="cardeHitrateSelect" style="display: none;">
<option value="3" selected>20%</option>
<option value="2">40%</option>
<option value="1">60%</option>
<option value="0">80%</option>
</select>
<h3 id="nesHeader" style="display: none;">NES Game</h3>
<select id="nesSelect" style="display: none;">
<option value="1DA8">Clu Clu Land</option>
<option value="1DAC">Balloon Fight</option>
<option value="1DB0">Donkey Kong</option>
<option value="1DB4">DK Jr Math</option>
<option value="1DB8">Pinball</option>
<option value="1DBC">Tennis</option>
<option value="1DC0">Golf</option>
<option value="1DDC">Excitebike</option>
<option value="1DC4">Punchout</option>
<option value="1DC8">Baseball</option>
<option value="1DCC">Clu Clu Land D</option>
<option value="1DD0">Donkey Kong 3</option>
<option value="1DD4">Donkey Kong Jr</option>
<option value="1DD8">Soccer</option>
<option value="1DE0">Wario's Woods</option>
</select>
<h3 id="itemHeader">Item</h3>
<div id="itemDiv" style="margin-bottom: 5px;"/>
<div style="margin-top: 5px;">
<button id="genButton">Generate Password</button>
</div>
</div>
<div style="float: left; background-color: rgb(255, 255, 255);">
<canvas id="generatorCanvas" style="background-image: url(https://dodo.ac/np/images/8/8a/Animal_Crossing_PAL_Font.svg); background-size: 450px 600px; width: 450px !important; height: 600px! important; display: block;"></canvas>
</div>
</fieldset>
`;

  const resultHTML = `
<fieldset>
<legend>Output</legend>
<div style="float: left;">
<h3>Password</h3>
<canvas id="outPwdCanvas" style="width: 393.75px; height: 75px; display: block; background-color: rgb(255, 255, 255); margin-bottom: 0px; outline-width: 2px; outline-color: rgb(0, 0, 0); outline-style: solid;"></canvas>
<br>
<p id="codeTypeInfoLabel">This code can only be told to Tom Nook.</p>
<br>
<br>
<h3>Plaintext Password</h3>
<p id="plaintext"></p>
</div>
</fieldset>
`;

  // Main logic

  // Font image
  const fontImg = new Image();
  fontImg.src = 'https://dodo.ac/np/images/8/8a/Animal_Crossing_PAL_Font.svg';

  // Currently selected canvas "textbox" info
  var selected_box = null;
  var selected_buf = null;
  var selected_box_cols = 0;
  var selected_box_rows = 0;
  var selected_box_char_idx = 0;

  // Item combobox (created dynamically later)
  var item_combobox = null;

  // Array which holds the current string0 param
  var nameBytes = new Uint8Array(8);
  nameBytes.fill(0x20);

  // Array which holds the current string1 param
  var townBytes = new Uint8Array(8);
  townBytes.fill(0x20);

  // Array which holds the current password string
  var passwordBuffer = new Uint8Array(28);
  passwordBuffer.fill(0x20);

  async function waitForElementById(id) {
    while (!document.getElementById(id)) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Insert our HTML. We wait for the element because the Nookipedia
  // tab system has a minor delay which causes a race condition
  // in the event it loads *after* this code executes
  async function initHTML() {
    await waitForElementById('ooui-2');
    $('#ooui-2').empty();
    $('#ooui-2').append(inputHTML);
    $('#ooui-2').append(resultHTML);
  }

  initHTML();

  function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function getElementOffset(el) {
    const rect = el.getBoundingClientRect();

    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
    };
  }

  function canvasSetCharacterPos(canvas, buf, e, chars_per_row, chars_per_col) {
    if (canvas === null) {
      return;
    }

    // Reset previously selected box highlight
    if (selected_box !== null && canvas != selected_box) {
      clearCanvas(selected_box);
      drawStringToCanvas(selected_buf, selected_box, 8, 1);
    }

    selected_box = canvas;
    selected_box_cols = chars_per_row;
    selected_box_rows = chars_per_col;
    selected_buf = buf;
    const ofs = getElementOffset(canvas);

    var x = e.pageX - ofs.left;
    var y = e.pageY - ofs.top;

    const char_width = canvas.width / chars_per_row;
    const char_height = canvas.height / chars_per_col;

    x = Math.floor(x / char_width);
    y = Math.floor(y / char_height);

    selected_box_char_idx = x + y * chars_per_row;
  }

  function drawStringToCanvas(buf, canvas, chars_per_row, chars_per_col) {
    const font_char_width = fontImg.width / 16;
    const font_char_height = fontImg.height / 16;

    const char_width = canvas.width / chars_per_row;
    const char_height = canvas.height / chars_per_col;

    const ctx = canvas.getContext('2d');
    for (var i = 0; i < buf.length; i++) {
      const row = Math.floor(i / chars_per_row);
      const font_x_ofs = Math.floor(buf[i] % 16);
      const font_y_ofs = Math.floor(buf[i] / 16);

      const sx = font_x_ofs * font_char_width;
      const sy = font_y_ofs * font_char_height;
      const sw = font_char_width;
      const sh = font_char_height;

      const dx = char_width * Math.floor(i % chars_per_row);
      const dy = char_height * row;
      const dw = char_width;
      const dh = char_height;

      ctx.drawImage(fontImg, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  }

  function highlightCurrentCharacter(canvas, e, chars_per_col, chars_per_row) {
    const ctx = canvas.getContext('2d');
    const ofs = getElementOffset(canvas);

    var x = e.pageX - ofs.left;
    var y = e.pageY - ofs.top;

    const char_width = canvas.width / chars_per_row;
    const char_height = canvas.height / chars_per_col;

    x = Math.floor(x / char_width);
    y = Math.floor(y / char_height);

    ctx.strokeStyle = 'red';
    ctx.strokeRect(
      x * char_width,
      y * char_height + 2,
      char_width,
      char_height - 4
    );
  }

  function highlightSelectedCharacter(canvas, chars_per_col, chars_per_row) {
    if (selected_box != canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const x = selected_box_char_idx % chars_per_row;
    const y = Math.floor(selected_box_char_idx / chars_per_row);

    const char_width = canvas.width / chars_per_row;
    const char_height = canvas.height / chars_per_col;

    ctx.fillStyle = 'yellow';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x * char_width, y * char_height, char_width, char_height);
    ctx.globalAlpha = 1.0;
  }

  function fontCanvasGetCharFromPos(canvas, e) {
    const ofs = getElementOffset(canvas);

    var x = e.pageX - ofs.left;
    var y = e.pageY - ofs.top;

    const char_width = canvas.width / 16;
    const char_height = canvas.height / 16;

    return Math.floor(x / char_width) + Math.floor(y / char_height) * 16;
  }

  function addCharacterToBuffer(buf, pos, char) {
    buf[pos] = char;
    if (buf == selected_buf) {
      const max = selected_box_rows * selected_box_cols;
      if (selected_box_char_idx < max - 1) {
        selected_box_char_idx++;
      }
    }
  }

  function setStr0Text(text) {
    document.getElementById('str0').innerText = text;
  }

  function setStr1Text(text) {
    document.getElementById('str1').innerText = text;
  }

  function toggleMagazineWinRate(enabled) {
    const label = document.getElementById('hitrateHeader');
    const select = document.getElementById('hitrateSelect');
    if (enabled) {
      label.style.removeProperty('display');
      select.style.removeProperty('display');
    } else {
      label.style.display = 'none';
      select.style.display = 'none';
    }
  }

  function toggleCardENESRate(enabled) {
    const label = document.getElementById('cardeHitrateHeader');
    const select = document.getElementById('cardeHitrateSelect');
    if (enabled) {
      label.style.removeProperty('display');
      select.style.removeProperty('display');
    } else {
      label.style.display = 'none';
      select.style.display = 'none';
    }
  }

  function toggleVillagerInfo(enabled) {
    const villagerSelect = document.getElementById('villagerSelect');
    const specialVillagerSelect = document.getElementById(
      'specialVillagerSelect'
    );
    const villagerHeader = document.getElementById('villagerHeader');
    const specialVillagerHeader = document.getElementById(
      'specialVillagerHeader'
    );
    const toggle = document.getElementById('specialToggle');
    const specialToggleHeader = document.getElementById('specialToggleHeader');

    if (enabled) {
      if (!toggle.checked) {
        villagerSelect.style.removeProperty('display');
        villagerHeader.style.removeProperty('display');
      } else {
        specialVillagerSelect.style.removeProperty('display');
        specialVillagerHeader.style.removeProperty('display');
      }
      toggle.style.removeProperty('display');
      specialToggleHeader.style.removeProperty('display');
    } else {
      villagerSelect.style.display = 'none';
      specialVillagerSelect.style.display = 'none';
      villagerHeader.style.display = 'none';
      specialVillagerHeader.style.display = 'none';
      toggle.style.display = 'none';
      specialToggleHeader.style.display = 'none';
    }
  }

  function toggleNESItemList(enabled) {
    const iteminput = document.getElementById('itemDiv');
    const nesSelect = document.getElementById('nesSelect');
    const itemHeader = document.getElementById('itemHeader');
    const nesHeader = document.getElementById('nesHeader');

    if (enabled) {
      iteminput.style.display = 'none';
      itemHeader.style.display = 'none';
      nesSelect.style.removeProperty('display');
      nesHeader.style.removeProperty('display');
    } else {
      nesSelect.style.display = 'none';
      nesHeader.style.display = 'none';
      iteminput.style.removeProperty('display');
      itemHeader.style.removeProperty('display');
    }
  }

  function setCodeTypeInfoText(text) {
    $('#codeTypeInfoLabel').text(text);
  }

  function onCodeTypeChanged(e) {
    switch (Number(e.target.value)) {
      case CODE_TYPES.Famicom:
        setStr0Text('Player Name (String #1)');
        setStr1Text('Town Name (String #2)');
        setCodeTypeInfoText(
          'This code can be told to Tom Nook or mailed to any villager in town.'
        );
        toggleMagazineWinRate(false);
        toggleCardENESRate(false);
        toggleVillagerInfo(false);
        toggleNESItemList(true);
        break;

      case CODE_TYPES.Popular:
        setStr0Text('Player Name (String #1)');
        setStr1Text('Town Name (String #2)');
        setCodeTypeInfoText(
          'This code can be told to Tom Nook or mailed to any villager in town.'
        );
        toggleMagazineWinRate(false);
        toggleCardENESRate(false);
        toggleVillagerInfo(true);
        toggleNESItemList(false);
        break;

      case CODE_TYPES.CardE:
        setStr0Text('Custom Phrase (Last 8 characters)');
        setStr1Text('Custom Phrase (First 8 characters)');
        setCodeTypeInfoText(
          'This code only be mailed to a villager in town. Mailing it to the villager embedded in the code will give you the selected % chance to receive a NES game.'
        );
        toggleMagazineWinRate(false);
        toggleCardENESRate(true);
        toggleVillagerInfo(true);
        toggleNESItemList(false);
        break;

      case CODE_TYPES.Magazine:
        setStr0Text('Magazine Name (Last 8 characters)');
        setStr1Text('Magazine Name (First 8 characters)');
        setCodeTypeInfoText(
          'This code can be told to Tom Nook or mailed to any villager in town.'
        );
        toggleMagazineWinRate(true);
        toggleCardENESRate(false);
        toggleVillagerInfo(false);
        toggleNESItemList(false);
        break;

      case CODE_TYPES.User:
        setStr0Text('Player Name (String #1)');
        setStr1Text('Town Name (String #2)');
        setCodeTypeInfoText('This code can only be told to Tom Nook.');
        toggleMagazineWinRate(false);
        toggleCardENESRate(false);
        toggleVillagerInfo(false);
        toggleNESItemList(false);
        break;

      case CODE_TYPES.CardEMini:
        setStr0Text('Minigame Name (Last 8 characters)');
        setStr1Text('Minigame Name (First 8 characters)');
        setCodeTypeInfoText('This code can only be told to Tom Nook.');
        toggleMagazineWinRate(false);
        toggleCardENESRate(false);
        toggleVillagerInfo(false);
        toggleNESItemList(false);
        break;

      default:
        break;
    }
  }

  function init() {
    const codetype_select = document.getElementById('codetype');
    codetype_select.addEventListener('change', onCodeTypeChanged);

    var nameCanvas = document.getElementById('nameCanvas');
    nameCanvas.getContext('2d').canvas.width = nameCanvas.offsetWidth; // sync canvas width with element width
    nameCanvas.addEventListener('mousemove', function (e) {
      clearCanvas(nameCanvas);
      highlightSelectedCharacter(nameCanvas, 1, 8);
      drawStringToCanvas(nameBytes, nameCanvas, 8, 1);
      highlightCurrentCharacter(nameCanvas, e, 1, PARAM_STRING_SIZE);
    });
    nameCanvas.addEventListener('mouseout', function () {
      clearCanvas(nameCanvas);
      highlightSelectedCharacter(nameCanvas, 1, 8);
      drawStringToCanvas(nameBytes, nameCanvas, 8, 1);
    });
    nameCanvas.addEventListener('mousedown', function (e) {
      clearCanvas(nameCanvas);
      canvasSetCharacterPos(nameCanvas, nameBytes, e, 8, 1);
      highlightSelectedCharacter(nameCanvas, 1, 8);
      drawStringToCanvas(nameBytes, nameCanvas, 8, 1);
      highlightCurrentCharacter(nameCanvas, e, 1, PARAM_STRING_SIZE);
    });

    var townCanvas = document.getElementById('townCanvas');
    townCanvas.getContext('2d').canvas.width = townCanvas.offsetWidth; // sync canvas width with element width
    townCanvas.addEventListener('mousemove', function (e) {
      clearCanvas(townCanvas);
      highlightSelectedCharacter(townCanvas, 1, 8);
      drawStringToCanvas(townBytes, townCanvas, 8, 1);
      highlightCurrentCharacter(townCanvas, e, 1, PARAM_STRING_SIZE);
    });
    townCanvas.addEventListener('mouseout', function () {
      clearCanvas(townCanvas);
      highlightSelectedCharacter(townCanvas, 1, 8);
      drawStringToCanvas(townBytes, townCanvas, 8, 1);
    });
    townCanvas.addEventListener('mousedown', function (e) {
      clearCanvas(townCanvas);
      canvasSetCharacterPos(townCanvas, townBytes, e, 8, 1);
      highlightSelectedCharacter(townCanvas, 1, 8);
      drawStringToCanvas(townBytes, townCanvas, 8, 1);
      highlightCurrentCharacter(townCanvas, e, 1, PARAM_STRING_SIZE);
    });

    var generatorInputCanvas = document.getElementById('generatorCanvas');
    generatorInputCanvas.getContext('2d').canvas.width =
      generatorInputCanvas.offsetWidth; // sync canvas width with element width
    generatorInputCanvas.getContext('2d').canvas.height =
      generatorInputCanvas.offsetHeight;
    generatorInputCanvas.addEventListener('mousemove', function (e) {
      clearCanvas(generatorInputCanvas);
      highlightCurrentCharacter(generatorInputCanvas, e, 16, 16);
    });
    generatorInputCanvas.addEventListener('mouseout', function () {
      generatorInputCanvas
        .getContext('2d')
        .clearRect(
          0,
          0,
          generatorInputCanvas.width,
          generatorInputCanvas.height
        );
    });
    generatorInputCanvas.addEventListener('mousedown', function (e) {
      const char = fontCanvasGetCharFromPos(generatorInputCanvas, e);
      addCharacterToBuffer(selected_buf, selected_box_char_idx, char);
      clearCanvas(selected_box);
      highlightSelectedCharacter(
        selected_box,
        selected_box_rows,
        selected_box_cols
      );
      drawStringToCanvas(
        selected_buf,
        selected_box,
        selected_box_cols,
        selected_box_rows
      );
    });

    document.getElementById('specialToggle').addEventListener('change', (e) => {
      const villagerSelect = document.getElementById('villagerSelect');
      const specialVillagerSelect = document.getElementById(
        'specialVillagerSelect'
      );
      const villagerHeader = document.getElementById('villagerHeader');
      const specialVillagerHeader = document.getElementById(
        'specialVillagerHeader'
      );
      if (e.currentTarget.checked) {
        villagerSelect.style.display = 'none';
        villagerHeader.style.display = 'none';
        specialVillagerSelect.style.removeProperty('display');
        specialVillagerHeader.style.removeProperty('display');
      } else {
        specialVillagerSelect.style.display = 'none';
        specialVillagerHeader.style.display = 'none';
        villagerSelect.style.removeProperty('display');
        villagerHeader.style.removeProperty('display');
      }
    });

    const passwordCanvas = document.getElementById('outPwdCanvas');
    passwordCanvas.getContext('2d').canvas.width = passwordCanvas.offsetWidth; // sync canvas width with element width
    passwordCanvas.getContext('2d').canvas.height = passwordCanvas.offsetHeight;

    const genButton = document.getElementById('genButton');
    genButton.addEventListener('click', function () {
      const codetype_select = document.getElementById('codetype');
      const code_type = Number(codetype_select.value);
      if (
        isNaN(code_type) ||
        code_type < CODE_TYPES.Famicom ||
        code_type > CODE_TYPES.CardEMini
      ) {
        alert('Invalid code type! Please select a valid code type!');
        return;
      }

      var item_id = undefined;
      if (code_type == CODE_TYPES.Famicom) {
        item_id = Number('0x' + document.getElementById('nesSelect').value);
      } else {
        const value = item_combobox.value;
        const matched = value.match(/\[(\d+)\]/);

        // Check if the item id is set
        if (!matched) {
          alert('You must select an item before generating a password!');
          return;
        }

        const [_, item_id_number] = matched;
        item_id = Number('0x' + item_id_number);
      }

      // Check if the item name supplied is valid
      if (item_id === undefined) {
        alert(
          'Unknown item selected! Please use the auto-complete list to select a valid item for this password!'
        );
        return;
      }

      // Get "hit rate" for whichever code type
      var hitrate = 0;
      if (code_type == CODE_TYPES.Magazine) {
        hitrate = Number(document.getElementById('hitrateSelect').value) ?? 0;
      } else if (code_type == CODE_TYPES.CardE) {
        hitrate =
          Number(document.getElementById('cardeHitrateSelect').value) ?? 0;
      }

      // Get villager
      var npcCode = 0;
      var npcType = 0;
      if (code_type == CODE_TYPES.Popular || code_type == CODE_TYPES.CardE) {
        if (document.getElementById('specialToggle').checked) {
          npcType = 1;
          npcCode = document.getElementById(
            'specialVillagerSelect'
          ).selectedIndex;
        } else {
          npcCode = document.getElementById('villagerSelect').selectedIndex;
        }

        if (npcCode < 0) {
          npcCode = 0;
        }
      }

      // Generate password & update password canvas
      passwordBuffer = MakePassword(
        code_type,
        hitrate,
        nameBytes,
        townBytes,
        item_id,
        npcType,
        npcCode
      );
      clearCanvas(passwordCanvas);
      drawStringToCanvas(passwordBuffer, passwordCanvas, 14, 2);

      const password_text = ConvertBytesToUnicodeString(passwordBuffer);
      $('#plaintext').html(
        password_text.slice(0, 14) + '<br>' + password_text.slice(14)
      );
    });

    selected_box = nameCanvas;
    selected_buf = nameBytes;
    selected_box_cols = 8;
    selected_box_rows = 1;
    highlightSelectedCharacter(nameCanvas, 1, 8);
  }

  async function loadDependencies() {
    // Wait for our HTML to generate before executing the remaining logic
    await waitForElementById('maininputfield');

    // Load the generator/decoder
    mw.loader
      .getScript(
        'https://nookipedia.com/w/index.php?title=MediaWiki:Gadget-PasswordGenerator/Generator.js&ctype=text/javascript&action=raw'
      )
      .fail(function (err) {
        console.log('Error loading AC Password script: ' + err.message);
      })
      .done(function () {
        // Load the villager database next
        mw.loader
          .getScript(
            'https://nookipedia.com/w/index.php?title=MediaWiki:Gadget-PasswordGenerator/ACVillagerDatabase.json&ctype=application/json&action=raw'
          )
          .fail(function (err) {
            console.log('Error loading AC villager database: ' + err.message);
          })
          .done(function (data) {
            const info = JSON.parse(data);
            const villagerSelect = document.getElementById('villagerSelect');
            const specialVillagerSelect = document.getElementById(
              'specialVillagerSelect'
            );

            for (var i = 0; i < info.villagers.length; i++) {
              villagerSelect.appendChild(
                new Option(info.villagers[i].name, info.villagers[i].name)
              );
            }

            for (var i = 0; i < info.special.length; i++) {
              specialVillagerSelect.appendChild(
                new Option(info.special[i].name, info.special[i].name)
              );
            }

            // Load the item list
            mw.loader
              .getScript(
                'https://nookipedia.com/w/index.php?title=MediaWiki:Gadget-PasswordGenerator/ACItemDatabase.json&ctype=application/json&action=raw'
              )
              .fail(function (err) {
                console.log('Error loading AC item database: ' + err.message);
              })
              .done(function (data) {
                const item_data_array = JSON.parse(data);
                const options = [];

                for (var i = 0; i < item_data_array.length; i++) {
                  const { id, name } = item_data_array[i];
                  options.push({
                    data: `${name} [${id}]`,
                  });
                }

                // Create our searchable item list combobox
                item_combobox = new OO.ui.ComboBoxInputWidget({
                  value: 'spooky wardrobe [1000]',
                  autocomplete: true,
                  options: options,
                  menu: {
                    filterFromInput: true,
                    filterMode: 'substring',
                  },
                });

                $(item_combobox.$element).css('width', '250px');
                $('#itemDiv').append(item_combobox.$element);

                // Initialize frontend UI
                init();
              });
          });
      });
  }

  // Begin loading
  loadDependencies();
})();

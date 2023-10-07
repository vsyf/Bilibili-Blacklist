// ==/UserScript==
(function() {
  // Define page types
  let pageTypes = ['searchPage', 'mainPage', 'leaderboard', 'timeLine', 'recommand', 'reply'];
  let pageTypesCN = { searchPage: '搜索页面', mainPage: '主页面', leaderboard: '排行榜', timeLine: '动态', recommand: '推荐', reply: '回复' };

  // Initialize blacklist with some default values
  let blacklist = GM_getValue('blacklist');
  if (blacklist === undefined) {
    blacklist = [{
      keyword: "此时一位萌新路过",
      isRegexp: false,
      searchPage: true,
      mainPage: true,
      leaderboard: true,
      timeLine: true,
      recommand: true,
      reply: true
    }];
    GM_setValue('blacklist', JSON.stringify(blacklist));
  } else {
    // Parse the stored JSON string back to a JavaScript object
    blacklist = JSON.parse(blacklist);
    // Upgrade script: add the 'isRegexp' property to all items in the blacklist
    for (let i = 0; i < blacklist.length; i++) {
      if (!('isRegexp' in blacklist[i])) {
        blacklist[i].isRegexp = false;
      }
    }

    // Save the updated blacklist back to GM storage
    GM_setValue('blacklist', JSON.stringify(blacklist));
  }

  let blockups = GM_getValue('blockups');
  if (blockups === undefined) {
    blockups = [{
      name: "测试屏蔽up主名字",
      isRegexp: false,
      searchPage: true,
      mainPage: true,
      leaderboard: true,
      timeLine: true,
      recommand: true,
      reply: true
    }];
    GM_setValue('blockups', JSON.stringify(blockups));
  } else {
    // Parse the stored JSON string back to a JavaScript object
    blockups = JSON.parse(blockups);
    // Upgrade script: add the 'isRegexp' property to all items in the blacklist
    for (let i = 0; i < blockups.length; i++) {
      if (!('isRegexp' in blockups[i])) {
        blockups[i].isRegexp = false;
      }
    }

    // Save the updated blacklist back to GM storage
    GM_setValue('blockups', JSON.stringify(blockups));
  }



  let blockPageTypes = {
    searchPage: {
      urlIncludes: 'search.bilibili.com',
      matchPairs: [
        { matchSelector: "div.bili-video-card__info--right", parentSelector: 'div.col_3' },
        { matchSelector: "div.media-card-content", parentSelector: "div.media-card" },
      ],
      cssModifications: {}
    },
    mainPage: {
      urlIncludes: 'www.bilibili.com',
      matchPairs: [
        { matchSelector: "div.bili-video-card__info--right", parentSelector: "div.bili-video-card" },
        { matchSelector: "div.bili-video-card__info--right", parentSelector: "div.feed-card" },
        { matchSelector: "div.bili-video-card__info--right", parentSelector: "div.floor-single-card" },
      ],
      cssModifications: '.recommended-container_floor-aside .container>*:nth-of-type(n + 8) {margin-top: 0px !important;}'
    },
    leaderboard: {
      urlIncludes: 'www.bilibili.com/v/popular',
      matchPairs: [
        { matchSelector: "div.video-card__info", parentSelector: "div.video-card" },
      ],
    },
    timeLine: {
      urlIncludes: 't.bilibili.com',
      matchPairs: [
        { matchSelector: "div.bili-dyn-content", parentSelector: "div.bili-dyn-list__item" },
      ],
    },
    recommand: {
      urlIncludes: 'www.bilibili.com/video/BV',
      matchPairs: [
        { matchSelector: "div.info", parentSelector: "div.video-page-card-small" },
      ],
    },
    reply: {
      urlIncludes: 'www.bilibili.com/video/BV',
      matchPairs: [
        { matchSelector: "div.root-reply", parentSelector: "div.content-warp" },
        { matchSelector: "span.reply-content-container.sub-reply-content", parentSelector: "div.sub-reply-item" },
      ],
    },
  };

  let prepareRegex = function() {
    // Find the page info for the current URL
    let pageInfos = [];
    for (let pageType in blockPageTypes) {
      if (window.location.href.includes(blockPageTypes[pageType].urlIncludes)) {
        let pageInfo = blockPageTypes[pageType];
        pageInfo.name = pageType;
        pageInfos.push(pageInfo);
      }
    }

    let containsStrings = [];
    if (pageInfos.length > 0) {
      pageInfos.forEach(pageInfo => {
        // Filter the blacklist to get the keywords that should be active on this page
        let activeKeywords = blacklist.filter(entry => entry[pageInfo.name])
          .map(entry => entry.isRegexp ? entry.keyword : entry.keyword.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'))
          .join('|');

        if (activeKeywords) {
          containsStrings.push({
            pageInfo: pageInfo,
            containsString: ":containsRegex('" + activeKeywords + "')"
          });
        }
      });
      return containsStrings;
    };
  }

  let block_blacklist = function(prepArray) {
    // Block AD
    $("svg.bili-video-card__info--ad").parents("div.bili-video-card").hide();
    $("svg.bili-video-card__info--ad").parents("div.feed-card").hide();
    $("div.video-page-special-card-small").hide();

    if (prepArray.length > 0) {
      prepArray.forEach(prep => {
        //console.log(prep.pageInfo.name)

        // Now hide all matching elements on the page
        prep.pageInfo.matchPairs.forEach(pair => {
          $(pair.matchSelector + prep.containsString).parents(pair.parentSelector).hide();
        });

        // Apply CSS modifications
        if (prep.pageInfo.cssModifications) {
          $('<style>').prop('type', 'text/css').html(prep.pageInfo.cssModifications).appendTo('head');
        }
      });
    }
  }

  let reblock_blacklist = function() {
    let prepArray = prepareRegex();
    block_blacklist(prepArray);
  }

  let reblock_blockups = function() { }

  let wrapper = $('<div>', {
    css: {
      position: 'fixed',
      bottom: '10px',
      left: '-90px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'row',
      opacity: 0.05
    },
    mouseenter: function() {
      $(this).animate({ left: '0px', opacity: 1 }, 200);
    },
    mouseleave: function() {
      $(this).animate({ left: '-90px', opacity: 0.05 }, 200);
    }
  });

  // Create the floating "B" button
  let buttonB = $('<button>', {
    text: '屏蔽',
    css: {
      backgroundColor: 'gray',
      color: 'white',
      borderRadius: '8px',
      padding: '10px',
      border: '2px solid white'
    },
    click: function() {
      let keyword = prompt('输入屏蔽关键词:');
      if (keyword) {
        // Add the keyword with all pages selected by default
        blacklist.push({
          keyword: keyword,
          isRegexp: false,
          searchPage: true,
          mainPage: true,
          leaderboard: true,
          timeLine: true,
          recommand: true,
          reply: true
        });

        // Save the updated blacklist to GM storage
        GM_setValue('blacklist', JSON.stringify(blacklist));

        reblock_blacklist();
      }
    }
  });

  // Create the floating "E" button
  let buttonE = $('<button>', {
    text: '管理',
    css: {
      backgroundColor: 'gray',
      color: 'white',
      borderRadius: '8px',
      padding: '10px',
      border: '2px solid white'
    },
    click: function() {
      if ($('#modal').length > 0) {
        $('#modal').remove();
        return;
      }

      // Build a custom modal dialog
      let modal = $('<div>', {
        id: 'modal',
        css: {
          position: 'fixed',
          width: '1000px',
          height: '400px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fff',
          padding: '20px',
          zIndex: 9999,
          overflowY: 'auto',
          border: '2px solid #000'
        }
      });
      // 在弹框中添加选项卡按钮容器
      let tabButtonsContainer = $('<div>', {
        css: {
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '20px',
          marginBottom: '20px',
          height: '40px',
          width: '100%', // 设置按钮容器宽度与弹框一致
        }
      });

      // 标题屏蔽列表
      let tabButton1 = $('<button>', {
        text: '屏蔽词管理',
        css: {
          flex: '1', // 平均分配按钮宽度
          backgroundColor: 'lightgray',
          outline: 'none', // 去掉默认的选中边框
        },
        click: function() {
          // 显示选项卡1内容
          $('.tab-content').hide();
          $('#tab-content-1').show();
          // 添加选中效果
          tabButton1.css('backgroundColor', 'gray');
          tabButton2.css('backgroundColor', 'lightgray');
          tabButton3.css('backgroundColor', 'lightgray');
        }
      });
      tabButtonsContainer.append(tabButton1);

      // UP主屏蔽列表
      let tabButton2 = $('<button>', {
        text: 'UP主管理',
        css: {
          flex: '1', // 平均分配按钮宽度
          backgroundColor: 'lightgray',
          outline: 'none', // 去掉默认的选中边框
        },
        click: function() {
          // 显示选项卡2内容
          $('.tab-content').hide();
          $('#tab-content-2').show();
          // 添加选中效果
          tabButton1.css('backgroundColor', 'lightgray');
          tabButton2.css('backgroundColor', 'gray');
          tabButton3.css('backgroundColor', 'lightgray');
        }
      });
      tabButtonsContainer.append(tabButton2);

      // 分区屏蔽列表
      let tabButton3 = $('<button>', {
        text: '分区管理',
        css: {
          flex: '1', // 平均分配按钮宽度
          backgroundColor: 'lightgray',
          outline: 'none', // 去掉默认的选中边框
        },
        click: function() {
          // 显示选项卡3内容
          $('.tab-content').hide();
          $('#tab-content-3').show();
          // 添加选中效果
          tabButton1.css('backgroundColor', 'lightgray');
          tabButton2.css('backgroundColor', 'lightgray');
          tabButton3.css('backgroundColor', 'gray');
        }
      });
      tabButtonsContainer.append(tabButton3);

      modal.append(tabButtonsContainer);

      // 在弹框中添加选项卡内容
      let tabContent1 = $('<div>', {
        id: 'tab-content-1',
        class: 'tab-content'
      });

      // 在这里添加选项卡1的内容，可以是任何你想要显示的内容
      modal.append(tabContent1);

      let tabContent2 = $('<div>', {
        id: 'tab-content-2',
        class: 'tab-content',
        style: 'display: none;' // 默认隐藏
      });

      // 在这里添加选项卡2的内容，可以是任何你想要显示的内容
      modal.append(tabContent2);

      let tabContent3 = $('<div>', {
        id: 'tab-content-3',
        class: 'tab-content',
        style: 'display: none;' // 默认隐藏
      });

      // 在这里添加选项卡3的内容，可以是任何你想要显示的内容
      modal.append(tabContent3);

      // 默认选中第一个选项卡按钮
      tabButton1.click();

      // Add exit button
      let exitButton = $('<button>', {
        text: '❌',
        css: {
          position: 'absolute',
          top: '10px',
          right: '10px'
        },
        click: function() {
          modal.remove();
        }
      });

      modal.append(exitButton);

      // Add each keyword to the modal with a '➖' button and checkboxes for each page type
      blacklist.forEach(function(entry, index) {
        let keyword = $('<span>', {
          text: entry.keyword,
          css: {
            display: 'inline-block',
            width: '380px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'middle'
          }
        });

        let item = $('<div>', {
          css: {
            marginBottom: '10px',
            width: '100%',
            verticalAlign: 'left',
          }
        });

        item.append(keyword);

        let removeButton = $('<button>', {
          text: '➖',
          css: {
            marginLeft: '10px'
          },
          click: function() {
            // Get the keyword of the current item
            let currentKeyword = entry.keyword;

            // Filter out the item with the current keyword
            blacklist = blacklist.filter(function(item) {
              return item.keyword !== currentKeyword;
            });

            // Save the updated blacklist to GM storage
            GM_setValue('blacklist', JSON.stringify(blacklist));

            // Remove this keyword from the modal
            item.remove();

            reblock_blacklist();
          }
        });
        item.append(removeButton);

        let regexpCheckbox = $('<input>', {
          type: 'checkbox',
          checked: entry.isRegexp,
          change: function() {
            // Update the blacklist when the checkbox is toggled
            entry.isRegexp = this.checked;
            GM_setValue('blacklist', JSON.stringify(blacklist));
            reblock_blacklist();
          }
        });

        let label = $('<label>', {
          text: '正则表达式',
          css: {
            marginLeft: '10px'
          }
        });

        label.prepend(regexpCheckbox);
        item.append(label);


        // Add a checkbox for each page type
        pageTypes.forEach(function(pageType) {
          let checkbox = $('<input>', {
            type: 'checkbox',
            checked: entry[pageType],
            change: function() {
              // Update the blacklist when a checkbox is toggled
              entry[pageType] = this.checked;
              GM_setValue('blacklist', JSON.stringify(blacklist));
              reblock_blacklist();
            }
          });

          let label = $('<label>', {
            text: pageTypesCN[pageType],
            css: {
              marginLeft: '10px'
            }
          });

          label.prepend(checkbox);
          item.append(label);
        });

        let editButton = $('<button>', {
          text: '编辑',
          css: {
            backgroundColor: 'lightgray',
            marginLeft: '10px'
          },
          click: function() {
            // Get the keyword of the current item
            let oldKeyword = entry.keyword;
            let newKeyword = prompt('更新屏蔽关键词:', oldKeyword);
            if (newKeyword) {
              for (let i = 0; i < blacklist.length; i++) {
                if (blacklist[i].keyword === oldKeyword) {
                  // 更新关键词的值
                  blacklist[i].keyword = newKeyword;
                  // 更新DOM中的文本内容
                  keyword.text(newKeyword);
                  // 在这里可以添加其他更新操作
                  // 如修改其他属性等
                  break; // 停止循环
                }
              }

              // Save the updated blacklist to GM storage
              GM_setValue('blacklist', JSON.stringify(blacklist));

              reblock_blacklist();
            }
          }
        });
        item.append(editButton)

        tabContent1.append(item);
      });
      // Add each keyword to the modal with a '➖' button and checkboxes for each page type
      blockups.forEach(function(entry, index) {
        let name = $('<span>', {
          text: entry.name,
          css: {
            display: 'inline-block',
            width: '380px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'middle'
          }
        });

        let item = $('<div>', {
          css: {
            marginBottom: '10px',
            width: '100%',
            verticalAlign: 'left',
          }
        });

        item.append(name);

        let removeButton = $('<button>', {
          text: '➖',
          css: {
            marginLeft: '10px'
          },
          click: function() {
            // Get the name of the current item
            let currentName = entry.name;

            // Filter out the item with the current keyword
            blockups = blockups.filter(function(item) {
              return item.name !== currentName;
            });

            // Save the updated blacklist to GM storage
            GM_setValue('blockups', JSON.stringify(blockups));

            // Remove this keyword from the modal
            item.remove();

            reblock_blockups();
          }
        });
        item.append(removeButton);

        let regexpCheckbox = $('<input>', {
          type: 'checkbox',
          checked: entry.isRegexp,
          change: function() {
            // Update the blacklist when the checkbox is toggled
            entry.isRegexp = this.checked;
            GM_setValue('blockups', JSON.stringify(blockups));
            reblock_blockups();
          }
        });

        let label = $('<label>', {
          text: '正则表达式',
          css: {
            marginLeft: '10px'
          }
        });

        label.prepend(regexpCheckbox);
        item.append(label);


        // Add a checkbox for each page type
        pageTypes.forEach(function(pageType) {
          let checkbox = $('<input>', {
            type: 'checkbox',
            checked: entry[pageType],
            change: function() {
              // Update the blacklist when a checkbox is toggled
              entry[pageType] = this.checked;
              GM_setValue('blockups', JSON.stringify(blockups));
              reblock_blockups();
            }
          });

          let label = $('<label>', {
            text: pageTypesCN[pageType],
            css: {
              marginLeft: '10px'
            }
          });

          label.prepend(checkbox);
          item.append(label);
        });

        let editButton = $('<button>', {
          text: '编辑',
          css: {
            backgroundColor: 'lightgray',
            marginLeft: '10px'
          },
          click: function() {
            // Get the keyword of the current item
            let oldName = entry.name;
            let newName = prompt('更新屏蔽up主:', oldName);
            if (newName) {
              for (let i = 0; i < blockups.length; i++) {
                if (blockups[i].name === oldName) {
                  // 更新关键词的值
                  blockups[i].name = newName;
                  // 更新DOM中的文本内容
                  name.text(newName);
                  // 在这里可以添加其他更新操作
                  // 如修改其他属性等
                  break; // 停止循环
                }
              }

              // Save the updated blacklist to GM storage
              GM_setValue('blockups', JSON.stringify(blockups));

              reblock_blockups();
            }
          }
        });
        item.append(editButton)

        tabContent2.append(item);
      });

      // Add save button
      let saveButton = $('<button>', {
        text: '✔️',
        css: {
          display: 'block',
          margin: '0 auto',
          marginTop: '10px'
        },
        click: function() {
          modal.remove();
          location.reload(); // refresh the page
        }
      });

      modal.append(saveButton);

      $('body').append(modal);
    }
  });

  //define containsRegex
  $.expr[":"].containsRegex = $.expr.createPseudo(function(arg) {
    var regexp = new RegExp(arg, 'i');
    return function(elem) {
      return regexp.test($(elem).text());
    };
  });

  let prepArray = prepareRegex();

  wrapper.append(buttonB, buttonE);
  $('body').append(wrapper);

  // Run the initial blacklist block
  block_blacklist(prepArray);

  let running = false;
  const observer = new MutationObserver(function(mutationsList, observer) {
    if (!running) {
      running = true;
      requestAnimationFrame(function() {
        block_blacklist(prepArray);
        running = false;
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

})();

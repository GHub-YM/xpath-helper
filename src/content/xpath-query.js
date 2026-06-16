(() => {
  const XPathHelper = window.XPathHelper;
  let currentResultElements = [];

function getElementText(element) {
  return (element?.textContent || '').trim();
}

function fuzzyTextMatch(text, keyword) {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;
  if (normalizedText.includes(normalizedKeyword)) return true;

  let keywordIndex = 0;
  for (const char of normalizedText) {
    if (char === normalizedKeyword[keywordIndex]) {
      keywordIndex += 1;
      if (keywordIndex === normalizedKeyword.length) return true;
    }
  }

  return false;
}

function filterElementsByText(elements, keyword) {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return elements;

  return elements.filter(element => fuzzyTextMatch(getElementText(element), normalizedKeyword));
}

function getFriendlyXPathError(xpath, error) {
  const message = error?.message || String(error);
  const checks = [
    {
      failed: (xpath.match(/"/g) || []).length % 2 !== 0,
      reason: '双引号没有成对闭合',
      suggestion: '检查 contains(text(), "...") 或属性值里的双引号。'
    },
    {
      failed: (xpath.match(/'/g) || []).length % 2 !== 0,
      reason: '单引号没有成对闭合',
      suggestion: '检查 XPath 字符串中的单引号。'
    },
    {
      failed: (xpath.match(/\[/g) || []).length !== (xpath.match(/\]/g) || []).length,
      reason: '中括号谓词没有成对闭合',
      suggestion: '检查类似 [@class="..."]、[contains(...)] 的条件。'
    },
    {
      failed: (xpath.match(/\(/g) || []).length !== (xpath.match(/\)/g) || []).length,
      reason: '函数括号没有成对闭合',
      suggestion: '检查 contains()、text()、starts-with() 等函数调用。'
    },
    {
      failed: /\/\/$/.test(xpath),
      reason: 'XPath 不能以 // 结尾',
      suggestion: '在 // 后补上节点名，例如 //div。'
    },
    {
      failed: /\[$/.test(xpath.trim()),
      reason: '谓词条件不完整',
      suggestion: '补全 ] 前的条件，例如 //div[contains(text(), "关键词")]。'
    }
  ];

  const matchedCheck = checks.find(check => check.failed);
  if (matchedCheck) {
    return `XPath语法错误：${matchedCheck.reason}。${matchedCheck.suggestion}`;
  }

  return `XPath语法错误：${message.replace(/^XPath查询错误:\s*/, '')}`;
}

function isXPathHelperUiElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE || !element.closest) {
    return false;
  }

  return Boolean(element.closest([
    '.xpath-panel',
    '.xpath-suggestions',
    '.xpath-suggestion-item',
    '.xpath-search-popup',
    '.xpath-history-popup',
    '.xpath-full-path-display',
    '.xpath-suggestion-tooltip',
    '.xpath-tooltip',
    '.xpath-element-tooltip',
    '.xpath-element-info'
  ].join(',')));
}

function isElementVisible(element) {
  // 检查元素是否存在
  if (!element || typeof element !== 'object') {
    return false;
  }
  
  // 检查元素是否在文档中
  if (!document.contains(element)) {
    return false;
  }
  
  // 检查元素是否是插件 UI 的一部分
  if (isXPathHelperUiElement(element)) {
    return false;
  }
  
  // 检查元素是否可见
  try {
    const rect = element.getBoundingClientRect();
    const isVisible = (
      rect.width > 0 && 
      rect.height > 0 &&
      rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom > 0 &&
      rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
      rect.right > 0
    );
    
    return isVisible;
  } catch (error) {
    return false;
  }
}

// 解析多行XPath，支持iframe查询
function parseMultiLineXPath(input) {
  const lines = input.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { iframePaths: [], elementPath: '' };
  }
  if (lines.length === 1) {
    return { iframePaths: [], elementPath: lines[0].trim() };
  }
  return {
    iframePaths: lines.slice(0, -1).map(line => line.trim()),
    elementPath: lines[lines.length - 1].trim()
  };
}

// 在指定文档中执行XPath查询
function executeXPathInDocument(xpath, documentContext) {
  try {
    return document.evaluate(
      xpath,
      documentContext,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
  } catch (error) {
    throw new Error(getFriendlyXPathError(xpath, error));
  }
}

// 递归查询iframe中的元素
async function queryElementsByXPathWithIframe(xpathConfig, currentDocument = document) {
  let currentContext = currentDocument;
  const matchedElements = [];
  
  // 遍历所有iframe路径
  for (const iframePath of xpathConfig.iframePaths) {
    const iframes = executeXPathInDocument(iframePath, currentContext);
    let foundValidIframe = false;
    
    // 遍历匹配的iframe
    for (let i = 0; i < iframes.snapshotLength; i++) {
      const iframe = iframes.snapshotItem(i);
      
      try {
        // 检查iframe是否可访问（处理跨域问题）
        if (iframe.contentDocument || iframe.contentWindow?.document) {
          const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
          currentContext = iframeDocument;
          foundValidIframe = true;
          break; // 只使用第一个匹配的可访问iframe
        }
      } catch (error) {
        // 跨域iframe访问错误，跳过
        continue;
      }
    }
    
    if (!foundValidIframe) {
      throw new Error(`无法访问iframe: ${iframePath}`);
    }
  }
  
  // 查询最终元素
  const elements = executeXPathInDocument(xpathConfig.elementPath, currentContext);
  for (let i = 0; i < elements.snapshotLength; i++) {
    const element = elements.snapshotItem(i);
    // 过滤掉插件 UI 及其所有子元素
    if (!isXPathHelperUiElement(element)) {
      matchedElements.push(element);
    }
  }
  
  return matchedElements;
}

async function executeXPath() {
  const panel = XPathHelper.UI.getPanel();
  if (!panel) return;
  const input = panel.querySelector('#xpath-input');
  const inputValue = input.value.trim();
  const resultInfo = panel.querySelector('.xpath-result-info');
  const resultList = panel.querySelector('.xpath-result-list');
  const resultFilter = panel.querySelector('#xpath-result-filter');
  const resultFilterValue = resultFilter?.value || '';

  // 清除之前的高亮
  XPathHelper.Highlight.clearHighlights();

  if (!inputValue) {
    resultInfo.textContent = '请输入XPath路径';
    if (resultList) {
      resultList.innerHTML = '';
    }
    // 隐藏右侧的查询结果展示面板
    const xpathRight = panel.querySelector('.xpath-right');
    if (xpathRight) {
      xpathRight.style.display = 'none';
    }
    // 当用户不输入路径时，设置左侧面板占据整个面板宽度
    const xpathLeft = panel.querySelector('.xpath-left');
    if (xpathLeft) {
      xpathLeft.style.flex = '1';
      xpathLeft.style.width = '100%';
    }
    // 当用户不输入路径时，设置整个面板宽度为240px，与两个窗口同时出现时输入窗口的宽度一致
    panel.style.width = '240px';
    
    // 当用户不输入路径时，隐藏完整路径显示框
    if (window.fullPathDisplay) {
      window.fullPathDisplay.style.display = 'none';
      window.fullPathDisplay.style.visibility = 'hidden';
      window.fullPathDisplay.style.opacity = '0';
    }
    
    return;
  }

  try {
    // 解析多行XPath
    const xpathConfig = parseMultiLineXPath(inputValue);
    
    // 查询元素
    const allMatchedElements = await queryElementsByXPathWithIframe(xpathConfig);
    const totalCount = allMatchedElements.length;
    
    // 过滤出可跳转/查看的元素
    const visibleElements = allMatchedElements.filter(isElementVisible);
    if (totalCount > 0) {
      await XPathHelper.History?.addEntry(inputValue);
    }
    currentResultElements = filterElementsByText(visibleElements, resultFilterValue);
    
    // 获取结果标题元素和右侧面板
    const resultTitle = panel.querySelector('.xpath-right h4');
    const resultList = panel.querySelector('.xpath-result-list');
    const xpathRight = panel.querySelector('.xpath-right');
    
    // 更新结果提示
    resultInfo.textContent = resultFilterValue.trim()
      ? `匹配到 ${totalCount} 个元素，可查看 ${visibleElements.length} 个，过滤后 ${currentResultElements.length} 个`
      : `匹配到 ${totalCount} 个元素，其中可跳转/查看的元素 ${visibleElements.length} 个`;

    if (xpathRight && resultList) {
      // 获取左侧面板
      const xpathLeft = panel.querySelector('.xpath-left');
      
      // 检查是否有可见元素
      if (visibleElements.length === 0) {
        // 隐藏查询结果展示相关UI
        xpathRight.style.display = 'none';
        // 当右侧面板隐藏时，设置左侧面板占据整个面板宽度
        if (xpathLeft) {
          xpathLeft.style.flex = '1';
          xpathLeft.style.width = '100%';
        }
        // 当右侧面板隐藏时，设置整个面板宽度为240px，与两个窗口同时出现时输入窗口的宽度一致
        panel.style.width = '240px';
        
        // 检查输入框是否为空
        if (inputValue.trim() !== '') {
          // 更新完整路径显示框的内容并重新定位它
          if (window.fullPathDisplay) {
            // 更新完整路径显示框的内容
            window.fullPathDisplay.textContent = inputValue;
            // 重新定位显示框
            window.positionFullPathDisplay();
          }
        }
      } else {
        // 显示查询结果展示相关UI
        xpathRight.style.display = 'flex';
        // 当右侧面板显示时，恢复左侧面板的flex: 1属性
        if (xpathLeft) {
          xpathLeft.style.flex = '1';
          xpathLeft.style.width = 'auto';
        }
        // 当右侧面板显示时，恢复整个面板宽度为480px，与两个窗口同时出现时的宽度一致
        panel.style.width = '480px';
        
        // 检查输入框是否为空
        if (inputValue.trim() !== '') {
          // 立即更新完整路径显示框的位置，确保它能正确适应面板宽度的变化
          if (window.fullPathDisplay) {
            // 更新完整路径显示框的内容
            window.fullPathDisplay.textContent = inputValue;
            // 重新定位显示框
            window.positionFullPathDisplay();
          }
        }
        
        // 为每个可见元素添加高亮
        currentResultElements.forEach(element => {
          XPathHelper.Highlight.highlightElement(element);
        });
        
        // 使用DocumentFragment批量创建结果项，减少DOM操作
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < currentResultElements.length; i++) {
          const element = currentResultElements[i];
          const text = getElementText(element) || '[空文本]';
          
          // 创建结果项元素
          const item = document.createElement('div');
          item.className = 'xpath-result-item';
          item.dataset.index = i;
          item.title = '点击定位到元素';
          
          // 创建内容容器
          const content = document.createElement('div');
          content.className = 'xpath-result-content';
          
          // 创建序号
          const number = document.createElement('span');
          number.className = 'xpath-result-number';
          number.textContent = `${i + 1}.`;
          
          // 创建文本容器
          const textContainer = document.createElement('div');
          textContainer.className = 'xpath-result-text-container';
          
          // 创建文本
          const textElement = document.createElement('span');
          textElement.className = 'xpath-result-text';
          textElement.textContent = text;
          
          // 创建复制按钮
          const copyBtn = document.createElement('button');
          copyBtn.className = 'xpath-copy-btn';
          copyBtn.dataset.index = i;
          copyBtn.title = '复制元素绝对路径';
          copyBtn.textContent = '📋';
          
          // 组装元素
          textContainer.appendChild(textElement);
          content.appendChild(number);
          content.appendChild(textContainer);
          item.appendChild(content);
          item.appendChild(copyBtn);
          
          // 添加到fragment
          fragment.appendChild(item);
        }
        
        // 清空结果列表并添加fragment
        resultList.innerHTML = '';
        if (currentResultElements.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'xpath-result-empty';
          empty.textContent = '没有符合过滤条件的结果';
          resultList.appendChild(empty);
        } else {
          resultList.appendChild(fragment);
        }
        
        // 立即更新完整路径显示框的内容并重新定位它，确保在添加完所有结果项后显示框可见
        setTimeout(() => {
          // 检查输入框是否为空
          if (inputValue.trim() !== '') {
            if (window.fullPathDisplay) {
              // 更新完整路径显示框的内容
              window.fullPathDisplay.textContent = inputValue;
              // 重新定位显示框
              window.positionFullPathDisplay();
            }
          }
        }, 50);
        
        // 检测文本是否超出容器宽度，根据需要添加滚动动画
        setTimeout(() => {
          resultList.querySelectorAll('.xpath-result-item').forEach(item => {
            const container = item.querySelector('.xpath-result-text-container');
            const text = item.querySelector('.xpath-result-text');
            
            if (container && text) {
              // 确保容器有正确的样式
              container.style.position = 'relative';
              container.style.overflow = 'hidden';
              
              // 强制计算布局
              text.style.display = 'inline-block';
              const textWidth = text.scrollWidth;
              const containerWidth = container.clientWidth;
              
              // 检查文本是否超出容器宽度
              if (textWidth > containerWidth) {
                // 文本超出，添加滚动动画和绝对定位
                text.style.position = 'absolute';
                // 根据文本长度动态计算动画持续时间，确保滚动速度统一
                const scrollDistance = textWidth + containerWidth;
                const scrollSpeed = 50; // 固定速度：50像素/秒
                const animationDuration = Math.max(5, Math.round(scrollDistance / scrollSpeed));
                text.style.animation = `xpath-text-scroll ${animationDuration}s linear infinite`;
                text.style.animationIterationCount = 'infinite';
                text.style.whiteSpace = 'nowrap';
                text.style.display = 'inline-block';
              } else {
                // 文本未超出，移除滚动动画和绝对定位
                text.style.animation = 'none';
                text.style.transform = 'none';
                text.style.position = 'static';
              }
            }
          });
          
          // 再次更新完整路径显示框的内容并重新定位它，确保浏览器有足够的时间处理所有DOM操作
          setTimeout(() => {
            // 检查输入框是否为空
            if (inputValue.trim() !== '') {
              if (window.fullPathDisplay) {
                // 更新完整路径显示框的内容
                window.fullPathDisplay.textContent = inputValue;
                // 重新定位显示框
                window.positionFullPathDisplay();
              }
            }
          }, 200);
        }, 300);
      }
    }
        
        // 使用事件委托为结果项添加点击事件，减少事件监听器数量
    if (!resultList.dataset.xpathResultListenersBound) {
      resultList.dataset.xpathResultListenersBound = 'true';

    resultList.addEventListener('click', (e) => {
      // 处理复制按钮点击
      if (e.target.classList.contains('xpath-copy-btn')) {
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index);
        const element = currentResultElements[index];
        const absolutePath = XPathHelper.Clipboard.getElementAbsolutePath(element);
        
        XPathHelper.Clipboard.copyToClipboard(absolutePath).then(success => {
          if (success) {
            // 显示复制成功提示
            const originalText = e.target.textContent;
            e.target.textContent = '✅';
            setTimeout(() => {
              e.target.textContent = originalText;
            }, 1000);
          }
        });
        return;
      }
      
      // 处理结果项点击
      const item = e.target.closest('.xpath-result-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        const element = currentResultElements[index];
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        // 临时增强高亮效果
        element.classList.remove(XPathHelper.Highlight.HIGHLIGHT_CLASS);
        for (let i = 0; i < 6; i++) {
          element.classList.remove(`level-${i}`);
        }
        setTimeout(() => {
          XPathHelper.Highlight.highlightElement(element);
          // 添加内部黄色脉冲效果
          XPathHelper.Highlight.activateElement(element);
          // 获取当前实时查询状态和输入框内容
          const isRealTimeEnabled = panel.querySelector('#xpath-real-time').checked;
          const xpathInput = panel.querySelector('#xpath-input');
          const xpath = xpathInput.value.trim();
          
          // 只有当实时查询关闭时，才考虑自动移除高亮
              if (!isRealTimeEnabled) {
                // 检查xpath路径是否有效且能匹配到当前元素
                const isXPathValid = xpath && XPathHelper.Clipboard.isXPathValidForElement(xpath, element);
                
                // 如果xpath路径无效或不能匹配到当前元素，3秒后自动移除高亮
                if (!isXPathValid) {
                  setTimeout(() => {
                    element.classList.remove(XPathHelper.Highlight.HIGHLIGHT_CLASS);
                    // 移除所有层级类
                    for (let i = 0; i < 6; i++) {
                      element.classList.remove(`level-${i}`);
                    }
                    // 从高亮元素数组中移除
                    const elementIndex = highlightedElements.indexOf(element);
                    if (elementIndex > -1) {
                      highlightedElements.splice(elementIndex, 1);
                    }
                  }, 3000);
                }
              }
        }, 100);
      }
    });
    
    // 使用事件委托添加鼠标悬停显示完整文本功能
    let tooltip = null;
    let tooltipTimer = null;
    let currentItem = null;
    
    resultList.addEventListener('mouseenter', (e) => {
      // 复制按钮不显示文本弹窗
      if (e.target.classList.contains('xpath-copy-btn')) {
        return;
      }
      
      const item = e.target.closest('.xpath-result-item');
      if (item) {
        // 清除之前的定时器
        if (tooltipTimer) {
          clearTimeout(tooltipTimer);
        }
        
        currentItem = item;
        
        // 延迟显示tooltip，避免快速移动鼠标时频繁创建
        tooltipTimer = setTimeout(() => {
          const index = parseInt(item.dataset.index);
          const element = currentResultElements[index];
          const fullText = getElementText(element) || '[空文本]';
          
          // 只有当文本被截断时才显示弹窗
          if (item.scrollWidth > item.clientWidth) {
            tooltip = document.createElement('div');
            tooltip.className = 'xpath-tooltip';
            tooltip.textContent = fullText;
            
            // 先添加到DOM，再计算尺寸和位置
            document.body.appendChild(tooltip);
            
            // 定位弹窗，避免超出屏幕
            const rect = item.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            let left = rect.left;
            let top = rect.bottom + 5;
            
            // 如果弹窗会超出屏幕右侧，调整位置
            if (left + tooltipRect.width > window.innerWidth) {
              left = window.innerWidth - tooltipRect.width - 10;
            }
            
            // 如果弹窗会超出屏幕底部，调整位置到元素上方
            if (top + tooltipRect.height > window.innerHeight) {
              top = rect.top - tooltipRect.height - 5;
            }
            
            // 确保不超出屏幕顶部
            if (top < 0) {
              top = 10;
            }
            
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
          }
        }, 300);
      }
    });
    
    resultList.addEventListener('mouseleave', (e) => {
      // 检查鼠标是否移动到了另一个结果项
      const nextItem = e.relatedTarget?.closest('.xpath-result-item');
      if (nextItem && nextItem !== currentItem) {
        currentItem = nextItem;
        return;
      }
      
      // 清除定时器
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
        tooltipTimer = null;
      }
      
      // 移除tooltip
      if (tooltip && tooltip.parentNode) {
        tooltip.remove();
        tooltip = null;
      }
      
      currentItem = null;
    });
    
    }
  } catch (error) {
    resultInfo.textContent = error.message;
    resultList.innerHTML = '';
    
    // 隐藏右侧的查询结果展示面板
    const xpathRight = panel.querySelector('.xpath-right');
    if (xpathRight) {
      xpathRight.style.display = 'none';
    }
    
    // 当右侧面板隐藏时，设置左侧面板占据整个面板宽度
    const xpathLeft = panel.querySelector('.xpath-left');
    if (xpathLeft) {
      xpathLeft.style.flex = '1';
      xpathLeft.style.width = '100%';
    }
    
    // 当右侧面板隐藏时，设置整个面板宽度为240px，与两个窗口同时出现时输入窗口的宽度一致
    panel.style.width = '240px';
    
    // 检查输入框是否为空
    if (inputValue.trim() === '') {
      // 当用户不输入路径时，隐藏完整路径显示框
      if (window.fullPathDisplay) {
        window.fullPathDisplay.style.display = 'none';
        window.fullPathDisplay.style.visibility = 'hidden';
        window.fullPathDisplay.style.opacity = '0';
      }
    } else {
      // 当用户输入路径时，更新完整路径显示框的内容并重新定位它
      if (window.fullPathDisplay) {
        // 更新完整路径显示框的内容
        window.fullPathDisplay.textContent = inputValue;
        // 重新定位显示框
        window.positionFullPathDisplay();
      }
    }
  }
}

// 监听来自background的消息

  XPathHelper.Query = {
    executeXPath,
    isXPathHelperUiElement,
    isElementVisible,
    parseMultiLineXPath,
    executeXPathInDocument,
    queryElementsByXPathWithIframe
  };
})();

(() => {
  const XPathHelper = window.XPathHelper;
  let highlightedElements = [];
  const HIGHLIGHT_CLASS = 'xpath-highlight';

function clearHighlights() {
  highlightedElements.forEach(element => {
    element.classList.remove(HIGHLIGHT_CLASS);
    element.classList.remove('xpath-highlight-active');
    for (let i = 0; i < 6; i++) {
      element.classList.remove(`level-${i}`);
    }
    element.removeEventListener('mouseenter', showElementInfo);
    element.removeEventListener('mouseleave', hideElementInfo);
  });
  highlightedElements = [];
  
  if (elementInfoTooltip && elementInfoTooltip.parentNode) {
    elementInfoTooltip.remove();
    elementInfoTooltip = null;
  }
  if (elementInfoTimer) {
    clearTimeout(elementInfoTimer);
    elementInfoTimer = null;
  }
}

function getElementDepth(element) {
  let depth = 0;
  let current = element;
  
  // 计算元素在DOM树中的深度
  while (current.parentElement && !current.closest('.xpath-panel')) {
    depth++;
    current = current.parentElement;
  }
  
  // 限制深度范围，确保使用定义的颜色类
  return depth % 6;
}

function highlightElement(element) {
  const depth = getElementDepth(element);
  element.classList.add(HIGHLIGHT_CLASS);
  element.classList.add(`level-${depth}`);
  highlightedElements.push(element);
  
  // 添加鼠标悬停事件，显示元素信息提示
  element.addEventListener('mouseenter', showElementInfo);
  element.addEventListener('mouseleave', hideElementInfo);
}

// 激活元素，添加内部黄色脉冲效果
function activateElement(element) {
  // 首先清除所有其他元素的激活状态
  highlightedElements.forEach(el => {
    el.classList.remove('xpath-highlight-active');
  });
  
  // 添加激活状态到当前元素
  element.classList.add('xpath-highlight-active');
  
  // 3秒后自动移除激活状态，使黄色脉冲效果消失
  setTimeout(() => {
    if (element.classList.contains('xpath-highlight-active')) {
      element.classList.remove('xpath-highlight-active');
    }
  }, 3000);
}

// 元素信息提示相关变量
let elementInfoTooltip = null;
let elementInfoTimer = null;

// 显示元素信息提示
function showElementInfo(e) {
  // 清除之前的定时器
  if (elementInfoTimer) {
    clearTimeout(elementInfoTimer);
  }
  
  // 延迟显示提示，避免快速移动鼠标时频繁创建
  elementInfoTimer = setTimeout(() => {
    const element = e.target;
    const info = getElementInfo(element);
    
    // 创建提示框
    elementInfoTooltip = document.createElement('div');
    elementInfoTooltip.className = 'xpath-element-info';

    const header = document.createElement('div');
    header.className = 'xpath-element-info-header';
    header.textContent = '\u5143\u7d20\u4fe1\u606f';

    const body = document.createElement('div');
    body.className = 'xpath-element-info-body';

    const appendInfoItem = (label, value) => {
      const item = document.createElement('div');
      item.className = 'xpath-element-info-item';

      const labelElement = document.createElement('span');
      labelElement.className = 'xpath-element-info-label';
      labelElement.textContent = label;

      const valueElement = document.createElement('span');
      valueElement.className = 'xpath-element-info-value';
      valueElement.textContent = value || '-';

      item.appendChild(labelElement);
      item.appendChild(valueElement);
      body.appendChild(item);
    };

    appendInfoItem('\u6807\u7b7e\u540d:', info.tagName);
    appendInfoItem('\u7c7b\u540d:', info.className);
    appendInfoItem('ID:', info.id);
    appendInfoItem('\u8def\u5f84:', info.path);
    appendInfoItem('\u4f4d\u7f6e:', info.position);
    appendInfoItem('\u5c3a\u5bf8:', info.size);
    appendInfoItem('\u53ef\u89c1\u6027:', info.visible ? '\u53ef\u89c1' : '\u4e0d\u53ef\u89c1');

    elementInfoTooltip.appendChild(header);
    elementInfoTooltip.appendChild(body);

    document.body.appendChild(elementInfoTooltip);
    
    // 定位提示框，避免超出屏幕
    const rect = element.getBoundingClientRect();
    const tooltipRect = elementInfoTooltip.getBoundingClientRect();
    
    let left = rect.right + 10;
    let top = rect.top;
    
    // 如果提示框会超出屏幕右侧，调整位置到元素左侧
    if (left + tooltipRect.width > window.innerWidth) {
      left = rect.left - tooltipRect.width - 10;
    }
    
    // 如果提示框会超出屏幕底部，调整位置
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height - 10;
    }
    
    // 确保不超出屏幕顶部
    if (top < 0) {
      top = 10;
    }
    
    elementInfoTooltip.style.left = `${left}px`;
    elementInfoTooltip.style.top = `${top}px`;
  }, 500);
}

// 隐藏元素信息提示
function hideElementInfo() {
  // 清除定时器
  if (elementInfoTimer) {
    clearTimeout(elementInfoTimer);
    elementInfoTimer = null;
  }
  
  // 移除提示框
  if (elementInfoTooltip && elementInfoTooltip.parentNode) {
    elementInfoTooltip.remove();
    elementInfoTooltip = null;
  }
}

// 获取元素信息
function getElementInfo(element) {
  const rect = element.getBoundingClientRect();
  const path = XPathHelper.Clipboard.getElementAbsolutePath(element);
  
  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className || '',
    id: element.id || '',
    path: path,
    position: `X: ${Math.round(rect.left)}, Y: ${Math.round(rect.top)}`,
    size: `W: ${Math.round(rect.width)}, H: ${Math.round(rect.height)}`,
    visible: isElementVisible(element)
  };
}


  XPathHelper.Highlight = {
    HIGHLIGHT_CLASS,
    clearHighlights,
    highlightElement,
    activateElement
  };
})();

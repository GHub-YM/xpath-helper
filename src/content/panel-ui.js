(() => {
  const XPathHelper = window.XPathHelper;
  let panel = null;

function createPanel() {
  panel = document.createElement('div');
  panel.className = 'xpath-panel';
  panel.innerHTML = `
    <div class="xpath-panel-header">
        <div class="xpath-header-buttons">
          <button class="xpath-close-btn">×</button>
          <button id="xpath-search-btn" title="实时查询">🔍</button>
          <button id="xpath-history-btn" title="XPath历史">⌘</button>
          <div id="xpath-history-popup" class="xpath-history-popup"></div>
          <div id="xpath-search-popup" class="xpath-search-popup">
            <label class="xpath-switch">
              <input type="checkbox" id="xpath-real-time" checked>
              <span class="xpath-slider"></span>
            </label>
            <span class="xpath-switch-label">实时查询</span>
          </div>
        </div>
    </div>
    <div class="xpath-panel-content">
      <div class="xpath-main-content">
        <div class="xpath-left">
          <div class="xpath-input-container">
            <textarea id="xpath-input" placeholder="输入或粘贴XPath路径"></textarea>
            <div id="xpath-suggestions" class="xpath-suggestions"></div>
          </div>
          <div class="xpath-result-info"></div>
        </div>
        <div class="xpath-right">
          <input id="xpath-result-filter" class="xpath-result-filter" type="text" placeholder="过滤结果文本">
          <div class="xpath-result-list"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // 默认隐藏右侧的查询结果展示面板
  const xpathRight = panel.querySelector('.xpath-right');
  if (xpathRight) {
    xpathRight.style.display = 'none';
  }
  
  // 默认设置左侧面板占据整个面板宽度
  const xpathLeft = panel.querySelector('.xpath-left');
  if (xpathLeft) {
    xpathLeft.style.flex = '1';
    xpathLeft.style.width = '100%';
  }
  
  // 默认设置整个面板宽度为240px，与两个窗口同时出现时输入窗口的宽度一致
  panel.style.width = '240px';
  
  // 默认设置查询结果提示文本框的初始提示文本
  const resultInfo = panel.querySelector('.xpath-result-info');
  if (resultInfo) {
    resultInfo.textContent = '请输入XPath路径';
  }

  // 添加拖拽功能
  let isDragging = false;
  let hasDragged = false; // 用于标记是否发生了拖动
  let startX, startY, startLeft, startTop;
  let dragStartTimeout = null;
  
  // 将拖拽事件绑定到整个面板
  panel.addEventListener('mousedown', (e) => {
    // 重置拖动标记
    hasDragged = false;
    
    // 获取当前面板位置，使用getBoundingClientRect更高效
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    
    // 延迟开始拖动，区分点击和拖动
    dragStartTimeout = setTimeout(() => {
      isDragging = true;
      hasDragged = true;
      
      // 添加全局事件监听
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }, 100);
    
    e.preventDefault();
  });
  
  // 点击事件用于恢复面板
  panel.addEventListener('click', (e) => {
    // 只有在非拖动状态且没有发生拖动时，才允许交互
    if (!isDragging && !hasDragged) {
      clearTimeout(dragStartTimeout);
    }
    
    // 重置拖动标记
    setTimeout(() => {
      hasDragged = false;
    }, 0);
  });
  
  // 直接在mousemove事件中更新位置，不使用requestAnimationFrame，确保即时反馈
  function handleMouseMove(e) {
    if (!isDragging) return;
    
    // 标记为已拖动
    hasDragged = true;
    
    // 计算移动距离
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    // 计算新位置
    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;
    
    // 获取关闭按钮元素
    const closeBtn = panel.querySelector('.xpath-close-btn');
    if (closeBtn) {
      // 获取关闭按钮尺寸和位置相对于面板的偏移
      const closeBtnRect = closeBtn.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const closeBtnOffsetX = closeBtnRect.left - panelRect.left;
      const closeBtnOffsetY = closeBtnRect.top - panelRect.top;
      const closeBtnWidth = closeBtnRect.width;
      const closeBtnHeight = closeBtnRect.height;
      
      // 获取浏览器窗口尺寸
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      
      // 边界检查，确保关闭按钮不会移动到浏览器窗口外
      // 左侧边界：确保关闭按钮左边缘不小于0
      newLeft = Math.max(newLeft, -closeBtnOffsetX);
      // 顶部边界：确保关闭按钮上边缘不小于0
      newTop = Math.max(newTop, -closeBtnOffsetY);
      // 右侧边界：确保关闭按钮右边缘不大于窗口宽度
      newLeft = Math.min(newLeft, windowWidth - (closeBtnOffsetX + closeBtnWidth));
      // 底部边界：确保关闭按钮下边缘不大于窗口高度
      newTop = Math.min(newTop, windowHeight - (closeBtnOffsetY + closeBtnHeight));
    }
    
    // 直接更新面板位置，不使用requestAnimationFrame，确保即时反馈
    panel.style.left = `${newLeft}px`;
    panel.style.top = `${newTop}px`;
    panel.style.transform = 'none';
    
    // 面板移动时更新完整路径显示框的位置
    if (window.fullPathDisplay) {
      window.positionFullPathDisplay();
    }
  }
  
  function handleMouseUp() {
    if (!isDragging) return;
    
    isDragging = false;
    
    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  


  // 添加事件监听
  const closeBtn = panel.querySelector('.xpath-close-btn');
  const searchBtn = panel.querySelector('#xpath-search-btn');
  // 设置全局变量
  window.xpathInput = panel.querySelector('#xpath-input');
  
  // 全局变量
window.fullPathDisplay = null; // 完整路径显示框元素
window.panel = panel; // 插件面板

// 定位完整路径显示框
window.positionFullPathDisplay = function() {
  if (!window.fullPathDisplay) return;
  
  // 获取大窗口（面板）的位置
  if (!panel) return;
  
  // 检查输入框是否为空
  if (window.xpathInput) {
    const inputValue = window.xpathInput.value;
    if (inputValue.trim() === '') {
      // 输入框为空，隐藏完整路径显示框
      window.fullPathDisplay.style.display = 'none';
      window.fullPathDisplay.style.visibility = 'hidden';
      window.fullPathDisplay.style.opacity = '0';
      return;
    }
  }
  
  // 确保完整路径显示框的内容是最新的
  if (window.xpathInput) {
    window.fullPathDisplay.textContent = window.xpathInput.value;
  }
  
  // 强制浏览器重排，确保获取到最新的面板尺寸
  panel.offsetWidth;
  
  // 强制浏览器重排，确保获取到最新的显示框尺寸
  window.fullPathDisplay.offsetWidth;
  
  const panelRect = panel.getBoundingClientRect();
  
  // 获取完整路径显示框的尺寸
  const displayRect = window.fullPathDisplay.getBoundingClientRect();
  
  // 计算显示框的位置（大窗口正下方）
  let left = panelRect.left + (panelRect.width - displayRect.width) / 2; // 相对于屏幕，水平居中
  let top = panelRect.bottom + 6; // 相对于屏幕，大窗口下方
  
  // 检查是否超出屏幕右侧边界
  if (left + displayRect.width > window.innerWidth) {
    left = window.innerWidth - displayRect.width - 10;
  }
  
  // 检查是否超出屏幕底部边界
  if (top + displayRect.height > window.innerHeight) {
    // 如果超出底部，尝试显示在大窗口上方
    const displayTop = panelRect.top - displayRect.height - 6;
    
    // 检查显示在上方是否超出屏幕顶部
    if (displayTop >= 0) {
      top = displayTop;
    } else {
      // 上方也不够空间，限制最大宽度
      window.fullPathDisplay.style.maxWidth = `${window.innerWidth - 20}px`;
      // 重新计算位置
      left = 10;
      top = 10;
    }
  } else {
    // 恢复最大宽度
    window.fullPathDisplay.style.maxWidth = 'none';
  }
  
  // 检查是否超出屏幕左侧边界
  if (left < 0) {
    left = 10;
  }
  
  // 检查是否超出屏幕顶部边界
  if (top < 0) {
    top = 10;
  }
  
  // 设置显示框位置
  window.fullPathDisplay.style.left = `${left}px`;
  window.fullPathDisplay.style.top = `${top}px`;
  
  // 确保显示框可见
  window.fullPathDisplay.style.display = 'block';
  window.fullPathDisplay.style.visibility = 'visible';
  window.fullPathDisplay.style.opacity = '1';
};

// 更新完整路径显示框的内容和位置
window.updateFullPathDisplay = function() {
  if (!window.fullPathDisplay) return;
  
  // 检查输入框是否为空
  if (window.xpathInput) {
    const inputValue = window.xpathInput.value;
    if (inputValue.trim() === '') {
      // 输入框为空，隐藏完整路径显示框
      window.fullPathDisplay.style.display = 'none';
      window.fullPathDisplay.style.visibility = 'hidden';
      window.fullPathDisplay.style.opacity = '0';
      return;
    } else {
      // 输入框不为空，更新内容
      window.fullPathDisplay.textContent = inputValue;
      // 重新定位
      window.positionFullPathDisplay();
    }
  }
};
  
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡到面板
    togglePanel();
  });
  
  // 为按钮添加mousedown事件，阻止触发面板的拖拽
  [closeBtn, searchBtn].forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.stopPropagation(); // 阻止事件冒泡到面板
      clearTimeout(dragStartTimeout); // 清除拖拽启动定时器
    });
  });
  
  // 初始化完整路径显示框并一直启用
  function initFullPathDisplay() {
    // 创建完整路径显示框
    window.fullPathDisplay = document.createElement('div');
    window.fullPathDisplay.id = 'xpath-full-path-display';
    window.fullPathDisplay.className = 'xpath-full-path-display';
    document.body.appendChild(window.fullPathDisplay);
    
    // 更新完整路径显示框的内容
    window.fullPathDisplay.textContent = window.xpathInput.value;
    
    // 检查输入框是否为空
    const inputValue = window.xpathInput.value;
    if (inputValue.trim() === '') {
      // 输入框为空，隐藏完整路径显示框
      window.fullPathDisplay.style.display = 'none';
      window.fullPathDisplay.style.visibility = 'hidden';
      window.fullPathDisplay.style.opacity = '0';
    } else {
      // 输入框不为空，显示完整路径显示框
      window.fullPathDisplay.style.display = 'block';
      window.fullPathDisplay.style.visibility = 'visible';
      window.fullPathDisplay.style.opacity = '1';
    }
    
    // 定位完整路径显示框
    window.positionFullPathDisplay();
    
    // 监听窗口大小变化，重新定位
    window.addEventListener('resize', window.positionFullPathDisplay);
    
    // 监听输入框内容变化，更新显示框内容和位置
    window.xpathInput.addEventListener('input', window.updateFullPathDisplay);
  }
  
  // 初始化完整路径显示功能
  initFullPathDisplay();
  
  // 为结果项中的复制按钮添加mousedown事件，阻止触发面板的拖拽
  const resultList = panel.querySelector('.xpath-result-list');
  if (resultList) {
    // 这里使用事件委托，处理未来动态添加的复制按钮
    resultList.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('xpath-copy-btn')) {
        e.stopPropagation(); // 阻止事件冒泡到面板
        clearTimeout(dragStartTimeout); // 清除拖拽启动定时器
      }
    });
  }
  
  // 定位查询按钮弹窗
  function positionSearchPopup() {
    const searchPopup = panel.querySelector('#xpath-search-popup');
    if (!searchPopup || !searchBtn || !panel) return;
    
    const panelRect = panel.getBoundingClientRect();
    const popupHeight = searchPopup.offsetHeight || 40;
    const popupWidth = 120; // 假设弹窗宽度为120px
    
    // 计算弹窗位置：显示在大窗口上方，与大窗口左对齐，不重叠
    let left = panelRect.left; // 与大窗口左对齐
    let top = panelRect.top - popupHeight - 10; // 大窗口上方10px，确保不重叠
    
    // 检查是否超出屏幕右侧边界
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - 10;
    }
    
    // 检查是否超出屏幕左侧边界
    if (left < 10) {
      left = 10;
    }
    
    // 检查是否超出屏幕顶部边界
    if (top < 10) {
      // 如果上方不够空间，显示在大窗口下方
      top = panelRect.bottom + 10; // 大窗口下方10px，确保不重叠
    }
    
    searchPopup.style.left = `${left}px`;
    searchPopup.style.top = `${top}px`;
  }
  
  // 鼠标悬停时定位弹窗
  searchBtn.addEventListener('mouseenter', () => {
    positionSearchPopup();
  });
  
  // 管理弹窗显示和隐藏的状态
  let popupTimeout = null;
  const searchPopup = panel.querySelector('#xpath-search-popup');
  
  // 搜索按钮鼠标进入
  searchBtn.addEventListener('mouseenter', () => {
    clearTimeout(popupTimeout);
    positionSearchPopup();
    // 显示弹窗
    if (searchPopup) {
      searchPopup.style.opacity = '1';
      searchPopup.style.visibility = 'visible';
      searchPopup.style.pointerEvents = 'auto';
    }
  });
  
  // 搜索按钮鼠标离开
  searchBtn.addEventListener('mouseleave', (e) => {
    // 检查鼠标是否移动到弹窗上
    const target = e.relatedTarget;
    if (!target || !target.closest('#xpath-search-popup')) {
      popupTimeout = setTimeout(() => {
        if (searchPopup) {
          searchPopup.style.opacity = '0';
          searchPopup.style.visibility = 'hidden';
          searchPopup.style.pointerEvents = 'none';
        }
      }, 200); // 200ms延迟，允许鼠标移动到弹窗
    }
  });
  
  // 弹窗鼠标进入
  if (searchPopup) {
    searchPopup.addEventListener('mouseenter', () => {
      clearTimeout(popupTimeout);
      // 保持弹窗显示
      searchPopup.style.opacity = '1';
      searchPopup.style.visibility = 'visible';
      searchPopup.style.pointerEvents = 'auto';
    });
    
    // 弹窗鼠标离开
    searchPopup.addEventListener('mouseleave', (e) => {
      // 检查鼠标是否移动到搜索按钮上
      const target = e.relatedTarget;
      if (!target || !target.closest('#xpath-search-btn')) {
        popupTimeout = setTimeout(() => {
          searchPopup.style.opacity = '0';
          searchPopup.style.visibility = 'hidden';
          searchPopup.style.pointerEvents = 'none';
        }, 200); // 200ms延迟，允许鼠标移动回搜索按钮
      }
    });
  }
  
  searchBtn.addEventListener('click', XPathHelper.Query.executeXPath);
  xpathInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      XPathHelper.Query.executeXPath();
    }
  });
  
  // 实时查询开关事件
  const realTimeSwitch = panel.querySelector('#xpath-real-time');
  const suggestions = panel.querySelector('#xpath-suggestions');
  
  realTimeSwitch.addEventListener('change', () => {
    if (realTimeSwitch.checked) {
      // 实时查询
      XPathHelper.Query.executeXPath();
    } else {
      // 关闭实时查询时清除高亮
      XPathHelper.Highlight.clearHighlights();
    }
  });
  
  // 为输入框和开关添加mousedown事件，允许正常交互
  const inputs = [xpathInput, realTimeSwitch];
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('mousedown', (e) => {
        e.stopPropagation(); // 阻止事件冒泡到面板
        clearTimeout(dragStartTimeout); // 清除拖拽启动定时器
      });
      
      // 确保输入框可以获取焦点
      input.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡到面板
        // 收起推荐词下拉框
        if (input === xpathInput) {
          suggestions.style.display = 'none';
        }
      });
    }
  });
  
  const resultFilter = panel.querySelector('#xpath-result-filter');
  if (resultFilter) {
    resultFilter.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    resultFilter.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    let resultFilterTimer = null;
    resultFilter.addEventListener('input', () => {
      clearTimeout(resultFilterTimer);
      resultFilterTimer = setTimeout(XPathHelper.Query.executeXPath, 180);
    });
  }

  // 添加XPath推荐词功能
  XPathHelper.Suggestions.attach({
    panel,
    xpathInput,
    realTimeSwitch,
    executeXPath: XPathHelper.Query.executeXPath
  });

  XPathHelper.History.attach({
    panel,
    xpathInput,
    executeXPath: XPathHelper.Query.executeXPath
  });
  
  let debounceTimer = null;
  xpathInput.addEventListener('input', () => {
    if (realTimeSwitch.checked) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(XPathHelper.Query.executeXPath, 500); // 500ms防抖
    }
  });
}


function togglePanel() {
  if (panel && panel.parentNode) {
    panel.remove();
    panel = null;
    XPathHelper.Highlight.clearHighlights();
    
    // 面板关闭时移除历史记录弹窗
    const historyPopup = document.querySelector('#xpath-history-popup');
    if (historyPopup && historyPopup.parentNode) {
      historyPopup.remove();
    }
    
    // 面板关闭时移除完整路径显示框
    if (window.fullPathDisplay && window.fullPathDisplay.parentNode) {
      window.fullPathDisplay.remove();
      window.fullPathDisplay = null;
    }
  } else {
    createPanel();
  }
}


  XPathHelper.UI = {
    createPanel,
    togglePanel,
    getPanel: () => panel
  };
})();

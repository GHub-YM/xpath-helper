let panel = null;
let highlightedElements = [];
const HIGHLIGHT_CLASS = 'xpath-highlight';

function clearHighlights() {
  highlightedElements.forEach(element => {
    element.classList.remove(HIGHLIGHT_CLASS);
    // 移除所有层级类
    for (let i = 0; i < 6; i++) {
      element.classList.remove(`level-${i}`);
    }
  });
  highlightedElements = [];
}



function createPanel() {
  panel = document.createElement('div');
  panel.className = 'xpath-panel';
  panel.innerHTML = `
    <div class="xpath-panel-header">
        <h3>XPath Helper</h3>
        <div class="xpath-header-buttons">
          <button class="xpath-close-btn">×</button>
        </div>
      </div>
    <div class="xpath-panel-content">
      <div class="xpath-main-content">
        <div class="xpath-left">
          <h4>路径查询输入框:</h4>
          <div class="xpath-input-container">
            <textarea id="xpath-input" placeholder="输入或粘贴XPath路径"></textarea>
            <div id="xpath-suggestions" class="xpath-suggestions"></div>
          </div>
          <div class="xpath-result-info"></div>
        </div>
        <div class="xpath-right">
          <h4>查询结果展示 (可见元素)</h4>
          <div class="xpath-result-list"></div>
        </div>
      </div>
      <div class="xpath-options">
        <div class="xpath-options-left">
          <label class="xpath-switch">
            <input type="checkbox" id="xpath-real-time" checked>
            <span class="xpath-slider"></span>
          </label>
          <span class="xpath-switch-label">实时查询</span>
        </div>
        <div class="xpath-options-right">
          <button id="xpath-search-btn" style="display: none;">查询</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

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
  const xpathInput = panel.querySelector('#xpath-input');
  
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
  
  searchBtn.addEventListener('click', executeXPath);
  xpathInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeXPath();
    }
  });
  
  // 实时查询开关事件
  const realTimeSwitch = panel.querySelector('#xpath-real-time');
  
  realTimeSwitch.addEventListener('change', () => {
    const localSearchBtn = panel.querySelector('#xpath-search-btn');
    if (realTimeSwitch.checked) {
      localSearchBtn.style.display = 'none';
      // 实时查询
      executeXPath();
    } else {
      localSearchBtn.style.display = 'block';
      // 关闭实时查询时清除高亮
      clearHighlights();
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
  
  // 添加XPath推荐词功能
  let suggestions = panel.querySelector('#xpath-suggestions');
  let xpathSuggestions = [];
  
  // 从外部JSON文件加载推荐词
  async function loadXPathSuggestions() {
    // 显示加载状态
    const showLoading = () => {
      suggestions.innerHTML = '<div class="xpath-suggestion-loading">加载中...</div>';
      suggestions.style.display = 'block';
    };
    
    // 隐藏加载状态
    const hideLoading = () => {
      suggestions.innerHTML = '';
      suggestions.style.display = 'none';
    };
    
    try {
      // 显示加载状态
      showLoading();
      
      // 获取扩展资源URL
      const suggestionsUrl = chrome.runtime.getURL('xpath-suggestions.json');
      const response = await fetch(suggestionsUrl);
      if (response.ok) {
        xpathSuggestions = await response.json();
      }
    } catch (error) {
      console.error('加载XPath推荐词失败:', error);
      // 使用默认推荐词作为 fallback
      xpathSuggestions = [
        { "expression": "//div", "description": "搜索所有<div>元素" },
        { "expression": "//span", "description": "搜索所有<span>元素" },
        { "expression": "//a", "description": "搜索所有<a>链接元素" },
        { "expression": "//button", "description": "搜索所有<button>元素" },
        { "expression": "//input", "description": "搜索所有<input>输入框" }
      ];
    } finally {
      // 隐藏加载状态
      hideLoading();
    }
  }
  
  // 加载推荐词
  loadXPathSuggestions();
  
  // 匹配推荐词
  function matchSuggestions(inputValue) {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return [];
    
    // 提取输入值中最后一个斜杠后的文本作为匹配关键词
    const lastSlashIndex = trimmedValue.lastIndexOf('/');
    const keyword = lastSlashIndex === -1 ? trimmedValue : trimmedValue.substring(lastSlashIndex + 1);
    
    // 转换为小写进行匹配
    const lowercaseKeyword = keyword.toLowerCase();
    const lowercaseInput = trimmedValue.toLowerCase();
    
    // 匹配推荐词并计算相关性分数
    return xpathSuggestions.map(suggestion => {
      const expression = suggestion.expression;
      const lowercaseExpr = expression.toLowerCase();
      let score = 0;
      
      // 1. 精确匹配整个表达式
      if (lowercaseExpr === lowercaseInput) {
        score += 100;
      }
      
      // 2. 表达式以输入值开头
      if (lowercaseExpr.startsWith(lowercaseInput)) {
        score += 80;
      }
      
      // 3. 提取表达式中最后一个斜杠后的部分进行匹配
      const lastExprSlashIndex = expression.lastIndexOf('/');
      const exprKeyword = lastExprSlashIndex !== -1 ? expression.substring(lastExprSlashIndex + 1) : expression;
      const lowercaseExprKeyword = exprKeyword.toLowerCase();
      
      // 4. 关键词精确匹配
      if (lowercaseExprKeyword === lowercaseKeyword) {
        score += 70;
      }
      
      // 5. 关键词以输入开头
      if (lowercaseExprKeyword.startsWith(lowercaseKeyword)) {
        score += 60;
      }
      
      // 6. 模糊匹配（关键词包含输入）
      if (lowercaseExprKeyword.includes(lowercaseKeyword)) {
        score += 40;
      }
      
      // 7. 表达式中包含输入值
      if (lowercaseExpr.includes(lowercaseKeyword)) {
        score += 30;
      }
      
      // 8. 根据表达式长度调整分数（更短的表达式通常更常用）
      score += (100 - Math.min(expression.length, 100)) / 10;
      
      return {
        suggestion,
        score
      };
    })
    // 过滤掉分数为0的结果
    .filter(item => item.score > 0)
    // 按分数降序排序
    .sort((a, b) => b.score - a.score)
    // 提取推荐词并限制数量
    .slice(0, 10)
    .map(item => item.suggestion);
  }
  
  // 更新推荐词列表
  function updateSuggestions() {
    // 清理所有现有的tooltip
    document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => {
      tooltip.remove();
    });
    
    const inputValue = xpathInput.value;
    const matches = matchSuggestions(inputValue);
    
    if (matches.length > 0) {
      // 确保suggestions元素存在且在document.body中
      if (!suggestions) {
        suggestions = document.createElement('div');
        suggestions.id = 'xpath-suggestions';
        suggestions.className = 'xpath-suggestions';
      }
      
      // 将suggestions元素移动到document.body中
      if (suggestions.parentNode !== document.body) {
        if (suggestions.parentNode) {
          suggestions.parentNode.removeChild(suggestions);
        }
        document.body.appendChild(suggestions);
      }
      
      // 生成推荐词HTML，确保转义特殊字符
      suggestions.innerHTML = '';
      
      // 逐个创建推荐词项，避免HTML解析问题
      matches.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'xpath-suggestion-item';
        item.dataset.value = suggestion.expression;
        
        // 创建词语元素（直接添加到item中，不再使用容器）
        const expressionSpan = document.createElement('span');
        expressionSpan.className = 'xpath-suggestion-expression';
        expressionSpan.textContent = suggestion.expression;
        
        // 创建描述文本元素（直接添加到item中，不再使用容器）
        const descriptionSpan = document.createElement('span');
        descriptionSpan.className = 'xpath-suggestion-description';
        descriptionSpan.textContent = suggestion.description;
        
        // 将元素直接添加到推荐词项中
        item.appendChild(expressionSpan);
        item.appendChild(descriptionSpan);
        
        suggestions.appendChild(item);
      });
      
      // 显示推荐词弹窗
      suggestions.style.display = 'block';
      
      // 优化弹窗位置，确保在输入框下方或上方且不被遮挡
      const updateSuggestionPosition = () => {
        const inputContainer = xpathInput.parentElement;
        const inputRect = inputContainer.getBoundingClientRect();
        
        // 恢复默认最大高度
        suggestions.style.maxHeight = '200px';
        
        // 先设置宽度，确保获取尺寸时正确
        suggestions.style.width = `${inputRect.width}px`;
        
        // 重新获取弹窗尺寸（使用默认高度）
        const suggestionsRect = suggestions.getBoundingClientRect();
        
        // 计算弹窗的默认位置（输入框下方）
        let left = inputRect.left; // 相对于屏幕
        let top = inputRect.bottom + 6; // 相对于屏幕
        let positionAbove = false;
        
        // 检查是否超出屏幕右侧边界
        if (left + suggestionsRect.width > window.innerWidth) {
          left = window.innerWidth - suggestionsRect.width - 10;
        }
        
        // 检查是否超出屏幕底部边界
        if (top + suggestionsRect.height > window.innerHeight) {
          // 如果超出底部，尝试显示在输入框上方
          const suggestionsTop = inputRect.top - suggestionsRect.height - 6;
          
          // 检查显示在上方是否超出屏幕顶部
          if (suggestionsTop >= 0) {
            // 可以显示在上方
            positionAbove = true;
            top = suggestionsTop;
          } else {
            // 上方也不够空间，限制最大高度
            const maxHeight = window.innerHeight - top - 10;
            suggestions.style.maxHeight = `${Math.max(maxHeight, 100)}px`;
          }
        }
        
        // 检查是否超出屏幕左侧边界
        if (left < 0) {
          left = 10;
        }
        
        // 设置弹窗位置
        suggestions.style.left = `${left}px`;
        suggestions.style.top = `${top}px`;
      };
      
      // 初始定位
      updateSuggestionPosition();
      
      // 监听窗口大小变化，重新定位
      window.addEventListener('resize', updateSuggestionPosition);
      
      // 在弹窗关闭时移除事件监听
      const removeResizeListener = () => {
        window.removeEventListener('resize', updateSuggestionPosition);
      };
      
      // 添加一次性事件监听器，在弹窗隐藏时移除resize监听
      const hideListener = () => {
        if (suggestions.style.display === 'none') {
          removeResizeListener();
          document.removeEventListener('click', hideListener);
        }
      };
      document.addEventListener('click', hideListener);
      
      // 为推荐词项添加事件监听
      const suggestionItems = suggestions.querySelectorAll('.xpath-suggestion-item');
      
      // 为每个推荐词项添加事件监听
      suggestionItems.forEach(item => {
        // 处理词语文本溢出 - 使用item作为参考容器
        const expressionElement = item.querySelector('.xpath-suggestion-expression');
        
        // 创建临时元素来测量词语实际宽度
        const tempExpressionElement = document.createElement('div');
        tempExpressionElement.style.position = 'absolute';
        tempExpressionElement.style.visibility = 'hidden';
        tempExpressionElement.style.whiteSpace = 'nowrap';
        tempExpressionElement.style.fontSize = '14px';
        tempExpressionElement.style.fontFamily = 'ui-monospace, SFMono-Regular, monospace';
        tempExpressionElement.style.fontWeight = '600';
        tempExpressionElement.textContent = expressionElement.textContent;
        document.body.appendChild(tempExpressionElement);
        
        // 测量词语实际宽度
        const expressionTempWidth = tempExpressionElement.offsetWidth;
        // 使用item的宽度作为容器宽度
        const expressionContainerWidth = item.clientWidth - 32; // 减去padding
        
        // 移除临时元素
        tempExpressionElement.remove();
        
        // 检查词语是否溢出
        if (expressionTempWidth > expressionContainerWidth) {
          // 词语溢出，添加滚动动画
          expressionElement.classList.add('scroll-animation');
          // 设置滚动距离为文本宽度
          expressionElement.style.width = `${expressionTempWidth}px`;
          // 根据文本长度动态计算动画持续时间，确保滚动速度统一
          const scrollDistance = expressionTempWidth + expressionContainerWidth;
          const scrollSpeed = 50; // 固定速度：50像素/秒
          const animationDuration = Math.max(5, Math.round(scrollDistance / scrollSpeed));
          expressionElement.style.animation = `xpath-text-scroll ${animationDuration}s linear infinite`;
        } else {
          // 词语未溢出，移除滚动动画
          expressionElement.classList.remove('scroll-animation');
          // 重置宽度
          expressionElement.style.width = 'auto';
          expressionElement.style.animation = 'none';
        }
        
        // 处理描述文本溢出 - 使用item作为参考容器
        const descriptionElement = item.querySelector('.xpath-suggestion-description');
        
        // 创建临时元素来测量描述文本实际宽度
        const tempDescriptionElement = document.createElement('div');
        tempDescriptionElement.style.position = 'absolute';
        tempDescriptionElement.style.visibility = 'hidden';
        tempDescriptionElement.style.whiteSpace = 'nowrap';
        tempDescriptionElement.style.fontSize = '12px';
        tempDescriptionElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
        tempDescriptionElement.textContent = descriptionElement.textContent;
        document.body.appendChild(tempDescriptionElement);
        
        // 测量描述文本实际宽度
        const descriptionTempWidth = tempDescriptionElement.offsetWidth;
        // 使用item的宽度作为容器宽度
        const descriptionContainerWidth = item.clientWidth - 32; // 减去padding
        
        // 移除临时元素
        tempDescriptionElement.remove();
        
        // 检查描述文本是否溢出
        if (descriptionTempWidth > descriptionContainerWidth) {
          // 描述文本溢出，添加滚动动画
          descriptionElement.classList.add('scroll-animation');
          // 设置滚动距离为文本宽度
          descriptionElement.style.width = `${descriptionTempWidth}px`;
          // 根据文本长度动态计算动画持续时间，确保滚动速度统一
          const scrollDistance = descriptionTempWidth + descriptionContainerWidth;
          const scrollSpeed = 50; // 固定速度：50像素/秒
          const animationDuration = Math.max(5, Math.round(scrollDistance / scrollSpeed));
          descriptionElement.style.animation = `xpath-text-scroll ${animationDuration}s linear infinite`;
        } else {
          // 描述文本未溢出，移除滚动动画
          descriptionElement.classList.remove('scroll-animation');
          // 重置宽度
          descriptionElement.style.width = 'auto';
          descriptionElement.style.animation = 'none';
        }
        
        // 点击事件
        item.addEventListener('click', () => {
          // 先将当前项设为active，并滚动到最上方
          const allItems = suggestions.querySelectorAll('.xpath-suggestion-item');
          allItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          
          // 滚动到当前项的顶部，确保其显示在最上方
          suggestions.scrollTop = item.offsetTop;
          
          // 执行原本的点击逻辑
          const currentValue = xpathInput.value.trim();
          const suggestionValue = item.dataset.value;
          let newValue = '';
          
          if (currentValue) {
            // 找到最后一个斜杠的位置
            const lastSlashIndex = currentValue.lastIndexOf('/');
            
            if (lastSlashIndex !== -1) {
              // 保留斜杠前的内容，替换斜杠后的内容为推荐词
              newValue = currentValue.substring(0, lastSlashIndex + 1) + suggestionValue;
            } else {
              // 如果没有斜杠，直接替换整个内容
              newValue = suggestionValue;
            }
          } else {
            // 如果输入框为空，直接插入推荐词
            newValue = suggestionValue;
          }
          
          xpathInput.value = newValue;
          suggestions.style.display = 'none';
          // 清理tooltip
          document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => {
            tooltip.remove();
          });
          // 如果开启实时查询，自动执行查询
          if (realTimeSwitch.checked) {
            executeXPath();
          }
        });
        
        // 悬停显示完整文本功能
        let tooltipTimer = null;
        
        // 鼠标进入事件
        item.addEventListener('mouseenter', function handleMouseEnter() {
          // 获取xpath输入框的宽度作为参考
          const xpathInput = panel.querySelector('#xpath-input');
          const inputWidth = xpathInput.clientWidth;
          
          // 检查文本是否超出显示范围
          const expressionElement = this.querySelector('.xpath-suggestion-expression');
          const descriptionElement = this.querySelector('.xpath-suggestion-description');
          
          // 创建临时元素来测量文本实际宽度
          const tempElement = document.createElement('div');
          tempElement.style.position = 'absolute';
          tempElement.style.visibility = 'hidden';
          tempElement.style.whiteSpace = 'nowrap';
          tempElement.style.fontSize = '14px';
          tempElement.style.fontFamily = 'Arial, sans-serif';
          tempElement.style.width = `${inputWidth}px`;
          tempElement.innerHTML = `
            <span style="flex: 1; font-family: monospace; font-weight: bold; color: #2196f3; margin-right: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${expressionElement.textContent}</span>
            <span style="flex: 1.5; font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">${descriptionElement.textContent}</span>
          `;
          
          document.body.appendChild(tempElement);
          
          // 测量实际宽度
          const tempRect = tempElement.getBoundingClientRect();
          const isOverflowing = tempRect.width > inputWidth;
          
          // 移除临时元素
          tempElement.remove();
          
          // 只有当文本超出显示范围时，才显示悬停提示
          if (isOverflowing) {
            // 1秒延迟显示
            tooltipTimer = setTimeout(() => {
              // 获取完整文本
              const expression = expressionElement.textContent;
              const description = descriptionElement.textContent;
              const fullText = `${expression}: ${description}`;
              
              // 创建tooltip元素
              const tooltip = document.createElement('div');
              tooltip.className = 'xpath-suggestion-tooltip';
              tooltip.textContent = fullText;
              
              // 添加到文档
              document.body.appendChild(tooltip);
              
              // 定位tooltip，避免超出屏幕
              const rect = this.getBoundingClientRect();
              const tooltipRect = tooltip.getBoundingClientRect();
              
              let left = rect.left;
              let top = rect.bottom + 5;
              
              // 如果tooltip会超出屏幕右侧，调整位置
              if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 10;
              }
              
              // 如果tooltip会超出屏幕底部，调整位置到元素上方
              if (top + tooltipRect.height > window.innerHeight) {
                top = rect.top - tooltipRect.height - 5;
              }
              
              // 确保不超出屏幕顶部
              if (top < 0) {
                top = 10;
              }
              
              // 设置tooltip位置
              tooltip.style.left = `${left}px`;
              tooltip.style.top = `${top}px`;
            }, 1000); // 1秒延迟
            
            // 保存定时器到元素上，以便后续清理
            this.__tooltipTimer = tooltipTimer;
          }
        });
        
        // 鼠标离开事件
        item.addEventListener('mouseleave', function handleMouseLeave() {
          // 清除定时器
          if (this.__tooltipTimer) {
            clearTimeout(this.__tooltipTimer);
            delete this.__tooltipTimer;
          }
          
          // 移除tooltip
          document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => {
            tooltip.remove();
          });
        });
      });
      
      // 确保只添加一个mouseleave事件监听器到推荐词容器
      // 先移除旧的监听器，再添加新的
      suggestions.removeEventListener('mouseleave', handleSuggestionsMouseLeave);
      suggestions.addEventListener('mouseleave', handleSuggestionsMouseLeave);
    } else if (inputValue.trim()) {
      // 显示空状态
      suggestions.innerHTML = '<div class="xpath-suggestion-empty">没有找到匹配的推荐词</div>';
      suggestions.style.display = 'block';
      
      // 优化空状态弹窗位置，确保在输入框下方或上方且不被遮挡
      const updateSuggestionPosition = () => {
        const inputContainer = xpathInput.parentElement;
        const inputRect = inputContainer.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        
        // 恢复默认最大高度
        suggestions.style.maxHeight = '200px';
        
        // 重新获取弹窗尺寸（使用默认高度）
        const suggestionsRect = suggestions.getBoundingClientRect();
        
        // 计算弹窗的默认位置（输入框下方）
        let left = 0; // 相对于输入容器
        let top = inputRect.height + 6;
        let positionAbove = false;
        
        // 检查是否超出主窗口右侧边界
        const panelRight = panelRect.left + panelRect.width;
        const suggestionsRight = inputRect.left + left + suggestionsRect.width;
        
        if (suggestionsRight > panelRight) {
          // 调整左侧位置，确保弹窗在主窗口内
          left = panelRight - inputRect.left - suggestionsRect.width;
        }
        
        // 检查是否超出主窗口底部边界
        const panelBottom = panelRect.top + panelRect.height;
        const suggestionsBottom = inputRect.top + top + suggestionsRect.height;
        
        if (suggestionsBottom > panelBottom) {
          // 如果超出底部，尝试显示在输入框上方
          const suggestionsTop = inputRect.top - suggestionsRect.height - 6;
          
          // 检查显示在上方是否超出主窗口顶部
          if (suggestionsTop >= panelRect.top) {
            // 可以显示在上方
            positionAbove = true;
            top = -suggestionsRect.height - 6;
          } else {
            // 上方也不够空间，限制最大高度
            const maxHeight = panelBottom - inputRect.top - top - 10;
            suggestions.style.maxHeight = `${Math.max(maxHeight, 60)}px`;
          }
        }
        
        // 检查是否超出屏幕右侧边界
        if (inputRect.left + left + suggestionsRect.width > window.innerWidth) {
          left = window.innerWidth - inputRect.left - suggestionsRect.width - 10;
        }
        
        // 检查是否超出屏幕左侧边界
        if (inputRect.left + left < 0) {
          left = -inputRect.left + 10;
        }
        
        // 设置弹窗位置
        suggestions.style.left = `${left}px`;
        suggestions.style.top = `${top}px`;
      };
      
      // 初始定位
      updateSuggestionPosition();
      
      // 监听窗口大小变化，重新定位
      window.addEventListener('resize', updateSuggestionPosition);
      
      // 在弹窗关闭时移除事件监听
      const removeResizeListener = () => {
        window.removeEventListener('resize', updateSuggestionPosition);
      };
      
      // 添加一次性事件监听器，在弹窗隐藏时移除resize监听
      const hideListener = () => {
        if (suggestions.style.display === 'none') {
          removeResizeListener();
          document.removeEventListener('click', hideListener);
        }
      };
      document.addEventListener('click', hideListener);
    } else {
      suggestions.style.display = 'none';
      // 清理tooltip
      document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => {
        tooltip.remove();
      });
    }
  }
  
  // 推荐词容器鼠标离开事件处理函数
  function handleSuggestionsMouseLeave() {
    // 清除所有定时器（如果有）
    document.querySelectorAll('.xpath-suggestion-item').forEach(item => {
      if (item.__tooltipTimer) {
        clearTimeout(item.__tooltipTimer);
        delete item.__tooltipTimer; // 删除定时器属性
      }
    });
    
    // 移除所有tooltip
    document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => {
      tooltip.remove();
    });
  }
  
  // 为输入框添加input事件监听
  xpathInput.addEventListener('input', () => {
    updateSuggestions();
  });
  
  // 点击其他地方关闭推荐词列表和tooltip的事件
  document.addEventListener('click', (e) => {
    // 检查点击目标是否在推荐词弹窗、输入框或相关按钮内部
    const isInsideSuggestions = suggestions.contains(e.target);
    const isInsideInput = xpathInput.contains(e.target);
    
    // 检查点击目标是否是推荐词相关的元素
    const isSuggestionRelated = e.target.closest('.xpath-suggestion-item') || e.target.closest('.xpath-suggestions');
    
    // 关闭推荐词弹窗的条件：点击了外部区域且不是输入框
    if (!isInsideSuggestions && !isInsideInput && !isSuggestionRelated) {
      suggestions.style.display = 'none';
      // 清理tooltip
      document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => {
        tooltip.remove();
      });
    }
  });
  
  // 为输入框添加keydown事件监听，支持键盘导航
  xpathInput.addEventListener('keydown', (e) => {
    const items = Array.from(suggestions.querySelectorAll('.xpath-suggestion-item'));
    let activeItem = suggestions.querySelector('.xpath-suggestion-item.active');
    
    if (suggestions.style.display === 'block') {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // 确保至少有一个活动项
          if (!activeItem && items.length > 0) {
            activeItem = items[0];
            activeItem.classList.add('active');
          } else if (activeItem) {
            activeItem.classList.remove('active');
            const nextItem = activeItem.nextElementSibling || items[0];
            nextItem.classList.add('active');
            activeItem = nextItem;
          }
          
          // 平滑滚动到选中项，确保其在可视区域内
          if (activeItem && suggestions) {
            const itemRect = activeItem.getBoundingClientRect();
            const suggestionsRect = suggestions.getBoundingClientRect();
            
            if (itemRect.bottom > suggestionsRect.bottom) {
              // 滚动到底部
              suggestions.scrollTop += itemRect.bottom - suggestionsRect.bottom;
            } else if (itemRect.top < suggestionsRect.top) {
              // 滚动到顶部
              suggestions.scrollTop -= suggestionsRect.top - itemRect.top;
            }
          }
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          // 确保至少有一个活动项
          if (!activeItem && items.length > 0) {
            activeItem = items[items.length - 1];
            activeItem.classList.add('active');
          } else if (activeItem) {
            activeItem.classList.remove('active');
            const prevItem = activeItem.previousElementSibling || items[items.length - 1];
            prevItem.classList.add('active');
            activeItem = prevItem;
          }
          
          // 平滑滚动到选中项，确保其在可视区域内
          if (activeItem && suggestions) {
            const itemRect = activeItem.getBoundingClientRect();
            const suggestionsRect = suggestions.getBoundingClientRect();
            
            if (itemRect.bottom > suggestionsRect.bottom) {
              // 滚动到底部
              suggestions.scrollTop += itemRect.bottom - suggestionsRect.bottom;
            } else if (itemRect.top < suggestionsRect.top) {
              // 滚动到顶部
              suggestions.scrollTop -= suggestionsRect.top - itemRect.top;
            }
          }
          break;
          
        case 'Enter':
          e.preventDefault();
          if (activeItem) {
            // 执行原本的Enter键逻辑
            const currentValue = xpathInput.value.trim();
            const suggestionValue = activeItem.dataset.value;
            let newValue = '';
            
            if (currentValue) {
              // 找到最后一个斜杠的位置
              const lastSlashIndex = currentValue.lastIndexOf('/');
              
              if (lastSlashIndex !== -1) {
                // 保留斜杠前的内容，替换斜杠后的内容为推荐词
                newValue = currentValue.substring(0, lastSlashIndex + 1) + suggestionValue;
              } else {
                // 如果没有斜杠，直接替换整个内容
                newValue = suggestionValue;
              }
            } else {
              // 如果输入框为空，直接插入推荐词
              newValue = suggestionValue;
            }
            
            xpathInput.value = newValue;
            suggestions.style.display = 'none';
            if (realTimeSwitch.checked) {
              executeXPath();
            }
          } else {
            // 没有选择推荐词的情况
            // 如果开启了实时查询模式，收回推荐词展示
            if (realTimeSwitch.checked) {
              suggestions.style.display = 'none';
              // 执行查询
              executeXPath();
            }
          }
          break;
          
        case 'Escape':
          e.preventDefault();
          suggestions.style.display = 'none';
          break;
          
        case 'Tab':
          // 支持Tab键选择下一个推荐词
          if (e.shiftKey) {
            // Shift+Tab选择上一个
            e.preventDefault();
            if (activeItem) {
              activeItem.classList.remove('active');
              const prevItem = activeItem.previousElementSibling || items[items.length - 1];
              prevItem.classList.add('active');
            } else if (items.length > 0) {
              items[items.length - 1].classList.add('active');
            }
          } else {
            // Tab选择下一个
            e.preventDefault();
            if (activeItem) {
              activeItem.classList.remove('active');
              const nextItem = activeItem.nextElementSibling || items[0];
              nextItem.classList.add('active');
            } else if (items.length > 0) {
              items[0].classList.add('active');
            }
          }
          break;
      }
    }
  });
  
  // 实时查询输入事件（带防抖）
  let debounceTimer = null;
  xpathInput.addEventListener('input', () => {
    if (realTimeSwitch.checked) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(executeXPath, 500); // 500ms防抖
    }
  });
}

function togglePanel() {
  if (panel && panel.parentNode) {
    panel.remove();
    panel = null;
    clearHighlights();
  } else {
    createPanel();
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
  
  // 检查元素是否是插件面板的一部分
  if (element.closest && element.closest('.xpath-panel')) {
    return false;
  }
  
  // 检查元素是否是提示词窗口的一部分
  if (element.closest && element.closest('.xpath-suggestions')) {
    return false;
  }
  
  // 检查元素是否是提示词项的一部分
  if (element.closest && element.closest('.xpath-suggestion-item')) {
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
    throw new Error(`XPath查询错误: ${error.message}`);
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
    // 过滤掉插件面板及其所有子元素
    if (!element.closest || !element.closest('.xpath-panel')) {
      matchedElements.push(element);
    }
  }
  
  return matchedElements;
}

async function executeXPath() {
  const input = panel.querySelector('#xpath-input');
  const inputValue = input.value.trim();
  const resultInfo = panel.querySelector('.xpath-result-info');
  const resultList = panel.querySelector('.xpath-result-list');

  // 清除之前的高亮
  clearHighlights();

  if (!inputValue) {
    resultInfo.textContent = '请输入XPath路径';
    if (resultList) {
      resultList.innerHTML = '';
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
    
    // 更新结果提示
    resultInfo.textContent = `匹配到 ${totalCount} 个元素，其中可跳转/查看的元素 ${visibleElements.length} 个`;

    if (resultList) {
      let html = '';
      
      for (let i = 0; i < visibleElements.length; i++) {
        const element = visibleElements[i];
        const text = element.textContent.trim() || '[空文本]';
        html += `
          <div class="xpath-result-item" data-index="${i}">
            <div class="xpath-result-content">
              <span class="xpath-result-number">${i + 1}.</span>
              <div class="xpath-result-text-container">
                <span class="xpath-result-text">${text}</span>
              </div>
            </div>
            <button class="xpath-copy-btn" data-index="${i}" title="复制元素绝对路径">
              📋
            </button>
          </div>
        `;
      }
      
      resultList.innerHTML = html;
      
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
      }, 300);
    }
    
    // 高亮所有可见匹配元素
    visibleElements.forEach(element => {
      highlightElement(element);
    });
    
    // 验证xpath路径是否能匹配到指定元素
    function isXPathValidForElement(xpath, element) {
      try {
        const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < elements.snapshotLength; i++) {
          if (elements.snapshotItem(i) === element) {
            return true;
          }
        }
        return false;
      } catch (error) {
        return false;
      }
    }
    
    // 获取元素的绝对路径（简化格式，只包含tagName和必要的索引）
    function getElementAbsolutePath(element) {
      if (!element || !element.parentNode) {
        return '';
      }
      
      let path = [];
      let current = element;
      
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let tagName = current.tagName.toLowerCase();
        let index = 1;
        let sibling = current.previousElementSibling;
        
        // 计算同类型兄弟元素的索引
        while (sibling) {
          if (sibling.tagName.toLowerCase() === tagName) {
            index++;
          }
          sibling = sibling.previousElementSibling;
        }
        
        let selector = tagName;
        
        // 只有当有多个同类型兄弟元素时才添加索引
        if (index > 1) {
          selector = `${tagName}[${index}]`;
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      return '/' + path.join('/');
    }
    
    // 复制文本到剪贴板
    function copyToClipboard(text) {
      return navigator.clipboard.writeText(text).then(() => {
        // 可以添加复制成功的提示
        return true;
      }).catch(err => {
        console.error('复制失败:', err);
        return false;
      });
    }
    
    // 为结果项添加点击事件，点击时滚动到对应元素
    resultList.querySelectorAll('.xpath-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // 如果点击的是复制按钮，不执行滚动操作
        if (e.target.classList.contains('xpath-copy-btn')) {
          return;
        }
        
        const index = parseInt(item.dataset.index);
        const element = visibleElements[index];
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 临时增强高亮效果
        element.classList.remove(HIGHLIGHT_CLASS);
        for (let i = 0; i < 6; i++) {
          element.classList.remove(`level-${i}`);
        }
        setTimeout(() => {
          highlightElement(element);
          // 获取当前实时查询状态和输入框内容
          const isRealTimeEnabled = panel.querySelector('#xpath-real-time').checked;
          const xpathInput = panel.querySelector('#xpath-input');
          const xpath = xpathInput.value.trim();
          
          // 只有当实时查询关闭时，才考虑自动移除高亮
          if (!isRealTimeEnabled) {
            // 检查xpath路径是否有效且能匹配到当前元素
            const isXPathValid = xpath && isXPathValidForElement(xpath, element);
            
            // 如果xpath路径无效或不能匹配到当前元素，3秒后自动移除高亮
            if (!isXPathValid) {
              setTimeout(() => {
                element.classList.remove(HIGHLIGHT_CLASS);
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
      });
      
      // 添加鼠标悬停显示完整文本功能
      let tooltip = null;
      
      item.addEventListener('mouseenter', (e) => {
        // 复制按钮不显示文本弹窗
        if (e.target.classList.contains('xpath-copy-btn')) {
          return;
        }
        
        const index = parseInt(item.dataset.index);
        const element = visibleElements[index];
        const fullText = element.textContent.trim() || '[空文本]';
        
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
      });
      
      item.addEventListener('mouseleave', () => {
        if (tooltip && tooltip.parentNode) {
          tooltip.remove();
          tooltip = null;
        }
      });
    });
    
    // 为复制按钮添加点击事件
    resultList.querySelectorAll('.xpath-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡到结果项
        const index = parseInt(btn.dataset.index);
        const element = visibleElements[index];
        const absolutePath = getElementAbsolutePath(element);
        
        copyToClipboard(absolutePath).then(success => {
          if (success) {
            // 显示复制成功提示
            const originalText = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 1000);
          }
        });
      });
    });
    
  } catch (error) {
    resultInfo.textContent = `错误: ${error.message}`;
    resultList.innerHTML = '';
  }
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'togglePanel') {
    togglePanel();
  }
});
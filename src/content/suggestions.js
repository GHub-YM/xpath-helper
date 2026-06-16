(() => {
  const XPathHelper = window.XPathHelper;
  const MAX_SUGGESTIONS = 10;
  const MIN_PANEL_GAP = 10;

  function attach({ panel, xpathInput, realTimeSwitch, executeXPath }) {
    let suggestions = panel.querySelector('#xpath-suggestions');
    let xpathSuggestions = [];
    let resizeHandler = null;

    function ensureSuggestionsElement() {
      if (!suggestions) {
        suggestions = document.createElement('div');
        suggestions.id = 'xpath-suggestions';
        suggestions.className = 'xpath-suggestions';
      }

      if (suggestions.parentNode !== document.body) {
        suggestions.parentNode?.removeChild(suggestions);
        document.body.appendChild(suggestions);
      }

      return suggestions;
    }

    function clearSuggestionTooltips() {
      document.querySelectorAll('.xpath-suggestion-tooltip').forEach(tooltip => tooltip.remove());
    }

    function clearSuggestionTimers() {
      suggestions?.querySelectorAll('.xpath-suggestion-item').forEach(item => {
        if (item.__tooltipTimer) {
          clearTimeout(item.__tooltipTimer);
          delete item.__tooltipTimer;
        }
      });
    }

    function hideSuggestions() {
      if (suggestions) {
        suggestions.style.display = 'none';
      }
      clearSuggestionTimers();
      clearSuggestionTooltips();
      removeResizeHandler();
    }

    function hideFullPathDisplay() {
      if (!window.fullPathDisplay) return;
      window.fullPathDisplay.style.display = 'none';
      window.fullPathDisplay.style.visibility = 'hidden';
      window.fullPathDisplay.style.opacity = '0';
    }

    function showLoading() {
      const suggestionList = ensureSuggestionsElement();
      hideFullPathDisplay();
      suggestionList.innerHTML = '<div class="xpath-suggestion-loading">加载中...</div>';
      suggestionList.style.display = 'block';
    }

    async function loadXPathSuggestions() {
      try {
        showLoading();
        const suggestionsUrl = chrome.runtime.getURL('xpath-suggestions.json');
        const response = await fetch(suggestionsUrl);
        if (response.ok) {
          xpathSuggestions = await response.json();
        } else {
          console.error('加载XPath推荐词失败:', response.statusText);
        }
      } catch (error) {
        console.error('加载XPath推荐词失败:', error);
      } finally {
        hideSuggestions();
      }
    }

    function getCurrentKeyword(inputValue) {
      const trimmedValue = inputValue.trim();
      if (!trimmedValue) return '';

      let lastSlashIndex = trimmedValue.lastIndexOf('/');
      if (lastSlashIndex === trimmedValue.length - 1) {
        lastSlashIndex = trimmedValue.lastIndexOf('/', lastSlashIndex - 1);
      }

      return lastSlashIndex === -1 ? trimmedValue : trimmedValue.substring(lastSlashIndex + 1);
    }

    function matchSuggestions(inputValue) {
      const keyword = getCurrentKeyword(inputValue).toLowerCase();
      if (!keyword) return [];

      return xpathSuggestions
        .filter(suggestion => {
          const expression = suggestion.expression;
          const lastExprSlashIndex = expression.lastIndexOf('/');
          const exprKeyword = lastExprSlashIndex !== -1 ? expression.substring(lastExprSlashIndex + 1) : expression;
          return exprKeyword.toLowerCase().startsWith(keyword);
        })
        .sort((a, b) => a.expression.length - b.expression.length)
        .slice(0, MAX_SUGGESTIONS);
    }

    function renderSuggestions(matches) {
      const suggestionList = ensureSuggestionsElement();
      suggestionList.innerHTML = '';

      matches.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'xpath-suggestion-item';
        item.dataset.value = suggestion.expression;

        const expressionSpan = document.createElement('span');
        expressionSpan.className = 'xpath-suggestion-expression';
        expressionSpan.textContent = suggestion.expression;

        const descriptionSpan = document.createElement('span');
        descriptionSpan.className = 'xpath-suggestion-description';
        descriptionSpan.textContent = suggestion.description;

        item.append(expressionSpan, descriptionSpan);
        suggestionList.appendChild(item);
      });

      return suggestionList;
    }

    function positionSuggestions() {
      const suggestionList = ensureSuggestionsElement();
      const inputRect = xpathInput.parentElement.getBoundingClientRect();

      suggestionList.style.maxHeight = '200px';
      suggestionList.style.width = `${inputRect.width}px`;

      const suggestionsRect = suggestionList.getBoundingClientRect();
      let left = inputRect.left;
      let top = inputRect.bottom + 6;

      if (left + suggestionsRect.width > window.innerWidth) {
        left = window.innerWidth - suggestionsRect.width - MIN_PANEL_GAP;
      }

      if (top + suggestionsRect.height > window.innerHeight) {
        const topAboveInput = inputRect.top - suggestionsRect.height - 6;
        if (topAboveInput >= 0) {
          top = topAboveInput;
        } else {
          const maxHeight = window.innerHeight - top - MIN_PANEL_GAP;
          suggestionList.style.maxHeight = `${Math.max(maxHeight, 100)}px`;
        }
      }

      suggestionList.style.left = `${Math.max(left, MIN_PANEL_GAP)}px`;
      suggestionList.style.top = `${Math.max(top, MIN_PANEL_GAP)}px`;
    }

    function addResizeHandler() {
      removeResizeHandler();
      resizeHandler = positionSuggestions;
      window.addEventListener('resize', resizeHandler);
    }

    function removeResizeHandler() {
      if (!resizeHandler) return;
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }

    function getReplacementValue(suggestionValue) {
      const currentValue = xpathInput.value.trim();
      if (!currentValue) return suggestionValue;

      const lastSlashIndex = currentValue.lastIndexOf('/');
      if (lastSlashIndex === -1) return suggestionValue;

      return currentValue.substring(0, lastSlashIndex + 1) + suggestionValue;
    }

    function selectSuggestion(item) {
      if (!item) return;
      xpathInput.value = getReplacementValue(item.dataset.value);
      hideSuggestions();

      if (realTimeSwitch.checked) {
        executeXPath();
      }
    }

    function setActiveItem(item) {
      suggestions.querySelectorAll('.xpath-suggestion-item').forEach(suggestionItem => {
        suggestionItem.classList.toggle('active', suggestionItem === item);
      });
      item?.scrollIntoView({ block: 'nearest' });
    }

    function moveActiveItem(direction) {
      const items = Array.from(suggestions.querySelectorAll('.xpath-suggestion-item'));
      if (!items.length) return;

      const activeItem = suggestions.querySelector('.xpath-suggestion-item.active');
      const activeIndex = activeItem ? items.indexOf(activeItem) : -1;
      const nextIndex = direction === 'previous'
        ? (activeIndex <= 0 ? items.length - 1 : activeIndex - 1)
        : (activeIndex + 1) % items.length;

      setActiveItem(items[nextIndex]);
    }

    function measureTextWidth(text, className) {
      const probe = document.createElement('span');
      probe.className = className;
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.whiteSpace = 'nowrap';
      probe.textContent = text;
      document.body.appendChild(probe);
      const width = probe.offsetWidth;
      probe.remove();
      return width;
    }

    function applyOverflowAnimation(element, containerWidth) {
      const textWidth = measureTextWidth(element.textContent, element.className);
      if (textWidth <= containerWidth) {
        element.classList.remove('scroll-animation');
        element.style.width = 'auto';
        element.style.animation = 'none';
        return;
      }

      element.classList.add('scroll-animation');
      element.style.width = `${textWidth}px`;
      const scrollDistance = textWidth + containerWidth;
      const animationDuration = Math.max(5, Math.round(scrollDistance / 50));
      element.style.animation = `xpath-text-scroll ${animationDuration}s linear infinite`;
    }

    function applyItemOverflow(item) {
      const containerWidth = Math.max(item.clientWidth - 32, 80);
      const expressionElement = item.querySelector('.xpath-suggestion-expression');
      const descriptionElement = item.querySelector('.xpath-suggestion-description');

      applyOverflowAnimation(expressionElement, containerWidth);
      applyOverflowAnimation(descriptionElement, containerWidth);
    }

    function shouldShowTooltip(item) {
      const expression = item.querySelector('.xpath-suggestion-expression')?.textContent || '';
      const description = item.querySelector('.xpath-suggestion-description')?.textContent || '';
      const inputWidth = xpathInput.clientWidth;
      const combinedWidth = measureTextWidth(`${expression} ${description}`, 'xpath-suggestion-expression');
      return combinedWidth > inputWidth;
    }

    function showTooltipForItem(item) {
      const expression = item.querySelector('.xpath-suggestion-expression')?.textContent || '';
      const description = item.querySelector('.xpath-suggestion-description')?.textContent || '';
      const tooltip = document.createElement('div');
      tooltip.className = 'xpath-suggestion-tooltip';
      tooltip.textContent = `${expression}: ${description}`;
      document.body.appendChild(tooltip);

      const itemRect = item.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let left = itemRect.left;
      let top = itemRect.bottom + 5;

      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - MIN_PANEL_GAP;
      }
      if (top + tooltipRect.height > window.innerHeight) {
        top = itemRect.top - tooltipRect.height - 5;
      }

      tooltip.style.left = `${Math.max(left, MIN_PANEL_GAP)}px`;
      tooltip.style.top = `${Math.max(top, MIN_PANEL_GAP)}px`;
    }

    function bindSuggestionItemEvents() {
      suggestions.querySelectorAll('.xpath-suggestion-item').forEach(item => {
        applyItemOverflow(item);

        item.addEventListener('click', () => {
          setActiveItem(item);
          suggestions.scrollTop = item.offsetTop;
          selectSuggestion(item);
        });

        item.addEventListener('mouseenter', () => {
          if (!shouldShowTooltip(item)) return;
          item.__tooltipTimer = setTimeout(() => showTooltipForItem(item), 1000);
        });

        item.addEventListener('mouseleave', () => {
          if (item.__tooltipTimer) {
            clearTimeout(item.__tooltipTimer);
            delete item.__tooltipTimer;
          }
          clearSuggestionTooltips();
        });
      });

      suggestions.removeEventListener('mouseleave', handleSuggestionsMouseLeave);
      suggestions.addEventListener('mouseleave', handleSuggestionsMouseLeave);
    }

    function updateSuggestions() {
      clearSuggestionTooltips();
      const matches = matchSuggestions(xpathInput.value);

      if (!matches.length) {
        hideSuggestions();
        return;
      }

      renderSuggestions(matches);
      hideFullPathDisplay();
      suggestions.style.display = 'block';
      positionSuggestions();
      addResizeHandler();
      bindSuggestionItemEvents();
    }

    function handleSuggestionsMouseLeave() {
      clearSuggestionTimers();
      clearSuggestionTooltips();
    }

    function handleDocumentClick(event) {
      const isInsideSuggestions = suggestions?.contains(event.target);
      const isInsideInput = xpathInput.contains(event.target);
      const isSuggestionRelated = event.target.closest('.xpath-suggestion-item, .xpath-suggestions');

      if (!isInsideSuggestions && !isInsideInput && !isSuggestionRelated) {
        hideSuggestions();
      }
    }

    function handleKeydown(event) {
      if (suggestions?.style.display !== 'block') return;

      const activeItem = suggestions.querySelector('.xpath-suggestion-item.active');

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          moveActiveItem('next');
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveActiveItem('previous');
          break;
        case 'Enter':
          event.preventDefault();
          if (activeItem) {
            selectSuggestion(activeItem);
          } else if (realTimeSwitch.checked) {
            hideSuggestions();
            executeXPath();
          }
          break;
        case 'Escape':
          event.preventDefault();
          hideSuggestions();
          break;
        case 'Tab':
          event.preventDefault();
          moveActiveItem(event.shiftKey ? 'previous' : 'next');
          break;
      }
    }

    xpathInput.addEventListener('input', updateSuggestions);
    xpathInput.addEventListener('keydown', handleKeydown);
    document.addEventListener('click', handleDocumentClick);

    loadXPathSuggestions();
  }

  XPathHelper.Suggestions = { attach };
})();

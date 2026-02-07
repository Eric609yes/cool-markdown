/**
 * Markdown 办公编辑器 v2.0 - 主逻辑脚本
 * ====================================
 * 
 * 功能模块:
 * 1. Markdown 编辑与预览
 * 2. 自动保存与数据持久化
 * 3. 搜索功能
 * 4. 快速编辑工具栏
 * 5. 工具面板 (计算器、画板、时钟、待办、便签、颜色转换器等)
 * 6. 主题切换 (深色模式 + 莫奈风格配色)
 * 7. 面板宽度拖拽调整
 * 8. 滚动同步
 * 9. 导入/导出功能
 * 10. Toast 通知系统
 * 
 * 技术特性:
 * - 使用 localStorage 实现数据持久化
 * - 使用 marked.js 进行 Markdown 解析
 * - 使用 highlight.js 进行代码高亮
 * - 事件委托优化性能
 * - 防抖处理减少不必要的操作
 * 
 * 作者: iFlow CLI
 * 开源协议: BSD 3-Clause
 */

// ========================================
// Markdown 编辑器功能
// ========================================

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');

/**
 * 防抖函数 - 优化频繁触发的事件
 * 
 * 防抖确保函数在指定时间内只执行一次，即使多次调用也只执行最后一次。
 * 常用于搜索输入、窗口调整大小等场景，减少不必要的计算和渲染。
 * 
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间(毫秒)，在这段时间内如果再次调用则重新计时
 * @returns {Function} 防抖后的函数
 * 
 * @example
 * const debouncedSearch = debounce(searchFunction, 300);
 * searchInput.addEventListener('input', debouncedSearch);
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 节流函数 - 限制函数执行频率
 * 
 * 节流确保函数在指定时间间隔内最多执行一次，忽略中间的多次调用。
 * 常用于滚动事件、鼠标移动等高频事件，提高性能。
 * 
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间间隔(毫秒)，函数执行之间的最小间隔
 * @returns {Function} 节流后的函数
 * 
 * @example
 * const throttledScroll = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 配置 marked 使用 highlight.js 进行代码高亮
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {}
        }
        return hljs.highlightAuto(code).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true
});

// ========================================
// 自动保存功能 (优化版)
// ========================================
const autoSaveInterval = 3000; // 3秒自动保存
const autoSaveStatus = document.getElementById('auto-save-status');

// 批量存储缓冲区，减少 localStorage I/O 次数
let pendingSaveData = {};
let saveTimeout = null;

/**
 * 批量保存数据到 localStorage
 * 
 * 将所有待保存的数据一次性写入 localStorage，减少 I/O 操作次数。
 */
function flushSaveData() {
    if (Object.keys(pendingSaveData).length === 0) return;
    
    try {
        // 使用批量写入减少 I/O
        Object.entries(pendingSaveData).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        pendingSaveData = {};
        showAutoSaveStatus('saved');
    } catch (e) {
        console.error('保存失败:', e);
    }
}

/**
 * 添加待保存数据到缓冲区
 * 
 * @param {string} key - 存储键
 * @param {string} value - 存储值
 */
function queueSaveData(key, value) {
    pendingSaveData[key] = value;
    
    // 重置定时器
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(flushSaveData, autoSaveInterval);
}

/**
 * 保存编辑器内容到 localStorage
 * 
 * 将当前编辑器的内容和保存时间戳保存到浏览器的 localStorage 中，
 * 实现数据的持久化存储，防止意外刷新丢失内容。
 */
function saveToLocalStorage() {
    queueSaveData('editorContent', editor.value);
    queueSaveData('editorLastSave', String(Date.now()));
}

/**
 * 显示自动保存状态提示
 * 
 * 在编辑器状态栏显示保存状态（正在保存/已保存），
 * 并在2秒后自动隐藏提示。
 * 
 * @param {string} status - 保存状态，可选值为 'saving' 或 'saved'
 */
function showAutoSaveStatus(status) {
    autoSaveStatus.classList.remove('saving', 'saved');
    if (status === 'saving') {
        autoSaveStatus.classList.add('saving');
        autoSaveStatus.textContent = '正在保存...';
    } else if (status === 'saved') {
        autoSaveStatus.classList.add('saved');
        autoSaveStatus.textContent = '已自动保存';
    }
    
    autoSaveStatus.classList.add('show');
    
    setTimeout(() => {
        autoSaveStatus.classList.remove('show');
    }, 2000);
}

// 使用防抖优化自动保存，减少不必要的localStorage写入
const debouncedSave = debounce(() => {
    saveToLocalStorage();
}, autoSaveInterval);

editor.addEventListener('input', debouncedSave);

// 页面卸载前确保所有数据已保存
window.addEventListener('beforeunload', () => {
    flushSaveData();
});

// 从localStorage加载保存的内容
/**
 * 从 localStorage 加载保存的内容
 * 
 * 尝试从 localStorage 恢复编辑器内容：
 * - 如果有保存的内容，直接加载并渲染预览
 * - 如果是第一次访问（hasVisited 不存在），显示欢迎介绍文本
 * - 如果已访问过但没有保存内容，显示空白编辑器
 */
function loadFromLocalStorage() {
    const savedContent = localStorage.getItem('editorContent');
    const hasVisited = localStorage.getItem('hasVisited');
    
    if (savedContent && savedContent.trim() !== '') {
        // 有保存的内容，直接加载
        editor.value = savedContent;
        preview.innerHTML = marked.parse(savedContent);
        showAutoSaveStatus('saved');
    } else if (!hasVisited) {
        // 第一次访问，显示介绍文本
        editor.value = editor.placeholder;
        preview.innerHTML = marked.parse(editor.placeholder);
        localStorage.setItem('hasVisited', 'true');
    } else {
        // 已访问过但没有保存内容，显示空白
        editor.value = '';
        preview.innerHTML = '';
    }
}

// ========================================
// 搜索功能
// ========================================
const searchBtn = document.getElementById('search-btn');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchPrev = document.getElementById('search-prev');
const searchNext = document.getElementById('search-next');
const searchClose = document.getElementById('search-close');
const searchCount = document.getElementById('search-count');

let searchMatches = [];
let currentMatchIndex = -1;

/**
 * 切换搜索栏的显示/隐藏状态
 * 
 * 如果搜索栏当前隐藏，则显示并聚焦到搜索输入框；
 * 如果搜索栏当前显示，则隐藏它。
 */
function toggleSearchBar() {
    const isVisible = searchBar.style.display !== 'none';
    searchBar.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        searchInput.focus();
    }
}

/**
 * 在编辑器中执行搜索
 * 
 * 搜索编辑器中所有匹配的文本，记录所有匹配项的位置和内容，
 * 并高亮显示第一个匹配项。搜索是全局且不区分大小写的。
 * 
 * 搜索结果会更新 searchMatches 数组和 searchCount 显示。
 */
function performSearch() {
    const searchText = searchInput.value.trim();
    if (!searchText) {
        searchCount.textContent = '0/0';
        clearSearchHighlights();
        return;
    }
    
    searchMatches = [];
    currentMatchIndex = -1;
    
    const content = editor.value;
    let match;
    // 转义正则表达式特殊字符，进行全局不区分大小写搜索
    const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    
    // 查找所有匹配项
    while ((match = regex.exec(content)) !== null) {
        searchMatches.push({
            index: match.index,
            text: match[0],
            end: match.index + match[0].length
        });
    }
    
    if (searchMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
    }
    
    searchCount.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
}

/**
 * 高亮显示当前搜索匹配项
 * 
 * 将光标定位到当前匹配项的位置，并自动滚动编辑器使匹配项可见。
 */
function highlightCurrentMatch() {
    if (searchMatches.length === 0 || currentMatchIndex < 0) return;
    
    const match = searchMatches[currentMatchIndex];
    editor.focus();
    editor.setSelectionRange(match.index, match.end);
    // 滚动到匹配项位置，使其显示在编辑器中间
    editor.scrollTop = editor.value.substring(0, match.index).split('\n').length * 20 - editor.clientHeight / 2;
}

/**
 * 导航到上一个或下一个搜索匹配项
 * 
 * @param {number} direction - 导航方向，-1 表示上一个，1 表示下一个
 * 
 * 支持循环导航：从第一个匹配项导航到上一个会跳到最后一个，
 * 从最后一个匹配项导航到下一个会跳到第一个。
 */
function navigateSearch(direction) {
    if (searchMatches.length === 0) return;
    
    currentMatchIndex += direction;
    
    // 循环导航
    if (currentMatchIndex < 0) {
        currentMatchIndex = searchMatches.length - 1;
    } else if (currentMatchIndex >= searchMatches.length) {
        currentMatchIndex = 0;
    }
    
    highlightCurrentMatch();
    searchCount.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
}

/**
 * 清除搜索结果和高亮
 * 
 * 清空搜索匹配项数组、重置当前匹配索引、更新搜索计数显示。
 */
function clearSearchHighlights() {
    searchMatches = [];
    currentMatchIndex = -1;
    searchCount.textContent = '0/0';
}

// 搜索按钮事件
searchBtn.addEventListener('click', toggleSearchBar);

// 优化：使用防抖处理搜索输入，减少频繁搜索
const debouncedPerformSearch = debounce(performSearch, 300);

// 搜索输入事件
searchInput.addEventListener('input', debouncedPerformSearch);
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        // 按Enter时立即执行搜索，不使用防抖
        performSearch();
        navigateSearch(1);
    } else if (e.key === 'Escape') {
        toggleSearchBar();
    }
});

// 搜索导航按钮
searchPrev.addEventListener('click', () => navigateSearch(-1));
searchNext.addEventListener('click', () => navigateSearch(1));
searchClose.addEventListener('click', toggleSearchBar);

// 替换功能
const replaceBtn = document.getElementById('replace-btn');
const replaceAllBtn = document.getElementById('replace-all-btn');
const replaceInput = document.getElementById('replace-input');

if (replaceBtn) {
    replaceBtn.addEventListener('click', function() {
        const searchText = searchInput.value.trim();
        const replaceText = replaceInput.value;
        
        if (!searchText || searchMatches.length === 0) {
            showToast('请先搜索内容');
            return;
        }
        
        if (currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
            const match = searchMatches[currentMatchIndex];
            const before = editor.value.substring(0, match.index);
            const after = editor.value.substring(match.end);
            
            editor.value = before + replaceText + after;
            editor.dispatchEvent(new Event('input'));
            
            showToast('已替换');
            
            // 重新搜索
            performSearch();
        }
    });
}

if (replaceAllBtn) {
    replaceAllBtn.addEventListener('click', function() {
        const searchText = searchInput.value.trim();
        const replaceText = replaceInput.value;
        
        if (!searchText) {
            showToast('请输入要搜索的内容');
            return;
        }
        
        const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matchCount = (editor.value.match(regex) || []).length;
        
        if (matchCount === 0) {
            showToast('未找到匹配内容');
            return;
        }
        
        if (confirm(`确定要替换全部 ${matchCount} 处内容吗？`)) {
            editor.value = editor.value.replace(regex, replaceText);
            editor.dispatchEvent(new Event('input'));
            showToast(`已替换 ${matchCount} 处`);
            performSearch();
        }
    });
}

// 快捷键 - 搜索
// 已合并到统一的键盘事件处理器中（见代码末尾）

// 清空编辑器功能
const clearBtn = document.getElementById('clear-btn');

clearBtn.addEventListener('click', function() {
    if (confirm('确定要清空编辑器内容吗？此操作不可撤销。')) {
        editor.value = '';
        preview.innerHTML = '';
        saveToLocalStorage();
        showToast('编辑器已清空');
    }
});

// 重置内容功能 - 恢复到初始欢迎内容
const resetBtn = document.getElementById('reset-btn');

resetBtn.addEventListener('click', function() {
    if (confirm('确定要重置编辑器内容吗？此操作将恢复到初始欢迎内容。')) {
        editor.value = editor.placeholder;
        preview.innerHTML = marked.parse(editor.placeholder);
        saveToLocalStorage();
        showToast('编辑器已重置');
    }
});

// 全屏编辑功能
const fullscreenBtn = document.getElementById('fullscreen-btn');

if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function() {
        container.classList.toggle('fullscreen');
        
        if (container.classList.contains('fullscreen')) {
            this.classList.add('active');
            showToast('按 Esc 退出全屏');
        } else {
            this.classList.remove('active');
        }
    });
}

// ESC键退出全屏和F11全屏切换
// 已合并到统一的键盘事件处理器中（见代码末尾）

// 滚动同步功能
const syncScrollBtn = document.getElementById('sync-scroll-btn');
let syncScrollEnabled = true;

syncScrollBtn.addEventListener('click', function() {
    syncScrollEnabled = !syncScrollEnabled;
    this.classList.toggle('active', syncScrollEnabled);
    showToast(syncScrollEnabled ? '滚动同步已开启' : '滚动同步已关闭');
});

// 滚动同步 (优化版 - 使用 requestAnimationFrame)
let isEditorScrolling = false;
let isPreviewScrolling = false;

// 编辑器滚动同步到预览区
editor.addEventListener('scroll', function() {
    if (!syncScrollEnabled || isPreviewScrolling) return;
    
    isEditorScrolling = true;
    
    requestAnimationFrame(() => {
        const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        const previewScrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
        preview.scrollTop = previewScrollTop;
        
        setTimeout(() => { isEditorScrolling = false; }, 50);
    });
});

// 预览区滚动同步到编辑器
preview.addEventListener('scroll', function() {
    if (!syncScrollEnabled || isEditorScrolling) return;
    
    isPreviewScrolling = true;
    
    requestAnimationFrame(() => {
        const scrollPercentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
        const editorScrollTop = scrollPercentage * (editor.scrollHeight - editor.clientHeight);
        editor.scrollTop = editorScrollTop;
        
        setTimeout(() => { isPreviewScrolling = false; }, 50);
    });
});

// 初始化
window.addEventListener('load', function() {
    loadFromLocalStorage();
    
    // 设置滚动同步按钮初始状态
    if (syncScrollEnabled) {
        syncScrollBtn.classList.add('active');
    }
});

// 复制Markdown功能
const copyMdBtn = document.getElementById('copy-md-btn');

if (copyMdBtn) {
    copyMdBtn.addEventListener('click', function() {
        const markdownContent = editor.value;
        
        // 使用 Clipboard API 复制纯文本
        navigator.clipboard.writeText(markdownContent).then(() => {
            showToast('Markdown内容已复制');
        }).catch(() => {
            // 如果Clipboard API失败，使用传统方法
            editor.select();
            document.execCommand('copy');
            // 取消选择
            editor.setSelectionRange(editor.value.length, editor.value.length);
            showToast('Markdown内容已复制');
        });
    });
}

// 保存进度功能
const saveProgressBtn = document.getElementById('save-progress-btn');

if (saveProgressBtn) {
    saveProgressBtn.addEventListener('click', function() {
        const progress = {
            timestamp: Date.now(),
            editorContent: editor.value,
            leftPanelWidth: leftPanel.style.flexBasis,
            centerPanelWidth: centerPanel.style.flexBasis,
            isDarkMode: document.body.classList.contains('dark-mode'),
            themeColor: localStorage.getItem('themeColor'),
            activeTool: document.querySelector('.tool-btn.active')?.dataset.tool || 'calculator',
            todos: JSON.parse(localStorage.getItem('todos') || '[]'),
            notes: JSON.parse(localStorage.getItem('notes') || '[]'),
            savedFileCount: parseInt(localStorage.getItem('savedFileCount') || '0')
        };
        
        // 保存到进度槽1
        localStorage.setItem('progress', JSON.stringify(progress));
        
        const date = new Date(progress.timestamp);
        showToast(`进度已保存 - ${date.toLocaleString()}`);
    });
}

// 恢复进度功能
const loadProgressBtn = document.getElementById('load-progress-btn');

if (loadProgressBtn) {
    loadProgressBtn.addEventListener('click', function() {
        const savedProgress = localStorage.getItem('progress');
        
        if (!savedProgress) {
            showToast('没有找到保存的进度');
            return;
        }
        
        if (confirm('确定要恢复保存的进度吗？这将覆盖当前内容。')) {
            const progress = JSON.parse(savedProgress);
            
            // 恢复编辑器内容
            editor.value = progress.editorContent;
            preview.innerHTML = marked.parse(progress.editorContent);
            
            // 恢复面板宽度
            if (progress.leftPanelWidth) {
                leftPanel.style.flexBasis = progress.leftPanelWidth;
            }
            if (progress.centerPanelWidth) {
                centerPanel.style.flexBasis = progress.centerPanelWidth;
            }
            
            // 恢复主题设置
            if (progress.isDarkMode) {
                document.body.classList.add('dark-mode');
                themeIcon.textContent = '☀️';
            } else {
                document.body.classList.remove('dark-mode');
                themeIcon.textContent = '🌙';
            }
            
            // 恢复主题色
            if (progress.themeColor) {
                document.body.classList.remove('theme-lotus', 'theme-sunrise', 'theme-sunset', 'theme-garden');
                if (progress.themeColor !== 'default') {
                    document.body.classList.add(`theme-${progress.themeColor}`);
                }
                localStorage.setItem('themeColor', progress.themeColor);
            }
            
            // 恢复工具选择
            if (progress.activeTool) {
                const toolBtn = document.querySelector(`[data-tool="${progress.activeTool}"]`);
                if (toolBtn) {
                    toolBtn.click();
                }
            }
            
            // 恢复待办事项
            if (progress.todos) {
                todos = progress.todos;
                saveTodos();
                renderTodos();
            }
            
            // 恢复便签
            if (progress.notes) {
                notes = progress.notes;
                saveNotes();
                renderNotes();
            }
            
            // 恢复保存计数
            if (progress.savedFileCount) {
                savedFileCount = progress.savedFileCount;
                localStorage.setItem('savedFileCount', savedFileCount);
            }
            
            // 更新字数统计
            updateWordCount();
            
            // 更新统计
            if (typeof updateStats === 'function') {
                updateStats();
            }
            
            const date = new Date(progress.timestamp);
            showToast(`进度已恢复 - ${date.toLocaleString()}`);
        }
    });
}

// 深色模式切换功能
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.querySelector('.theme-icon');

// 设置按钮
const settingsToggle = document.getElementById('settings-toggle');

// 从localStorage加载主题设置
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️';
}

themeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // 更新图标
    themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    
    // 保存主题设置
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // 重新调整画布大小（因为背景色变化）
    if (canvas) {
        setTimeout(resizeCanvas, 100);
    }
});

// 监听编辑器输入，实时更新预览
// 优化：使用更高效的节流处理Markdown解析，减少频繁的DOM更新
// 使用缓存机制避免重复解析相同内容
let lastMarkdownContent = '';
let cachedPreviewHTML = '';

const throttledUpdatePreview = throttle(function() {
    const markdown = editor.value;
    
    // 缓存优化：如果内容未变化，不重新解析
    if (markdown === lastMarkdownContent && cachedPreviewHTML) {
        return;
    }
    
    lastMarkdownContent = markdown;
    
    // 使用 requestAnimationFrame 优化渲染时机
    requestAnimationFrame(() => {
        try {
            cachedPreviewHTML = marked.parse(markdown);
            // 使用 DocumentFragment 减少重排
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cachedPreviewHTML;
            preview.innerHTML = '';
            preview.appendChild(tempDiv.firstChild);
        } catch (e) {
            console.error('Markdown解析错误:', e);
        }
        
        // 更新行列号
        updateLineColumnInfo();
    });
}, 200);

editor.addEventListener('input', throttledUpdatePreview);

// 监听编辑器选择变化，更新行列号
editor.addEventListener('keyup', function() {
    updateLineColumnInfo();
});

editor.addEventListener('click', function() {
    updateLineColumnInfo();
});

/**
 * 更新编辑器状态栏的行列号信息
 * 
 * 根据当前光标位置计算行号和列号，并更新到状态栏显示。
 * 行号从1开始计数，列号从0开始计数。
 */
function updateLineColumnInfo() {
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    
    const lineColInfo = document.getElementById('line-col-info');
    if (lineColInfo) {
        lineColInfo.textContent = `行 ${line}, 列 ${col}`;
    }
}

// ========================================
// 快速编辑功能
// ========================================
// 优化：使用事件委托代替为每个按钮单独添加监听器
const quickEditToolbar = document.querySelector('.quick-edit-toolbar');

quickEditToolbar.addEventListener('click', function(e) {
    const btn = e.target.closest('.quick-btn');
    if (!btn) return;
    
    const action = btn.dataset.action;
    if (action) {
        insertMarkdown(action);
    }
});

/**
 * 在编辑器中插入 Markdown 语法
 * 
 * 根据指定的操作类型，在当前光标位置插入相应的 Markdown 语法。
 * 如果选中有文本，则对选中的文本应用格式；如果没有选中文本，
 * 则插入带默认文本的格式占位符。
 * 
 * @param {string} action - 操作类型，可选值：
 *   - 'bold': 粗体
 *   - 'italic': 斜体
 *   - 'strikethrough': 删除线
 *   - 'h1', 'h2', 'h3': 标题
 *   - 'ul': 无序列表
 *   - 'ol': 有序列表
 *   - 'checkbox': 复选框
 *   - 'code': 行内代码
 *   - 'codeblock': 代码块
 *   - 'quote': 引用
 *   - 'link': 链接
 *   - 'image': 图片
 *   - 'table': 表格
 *   - 'hr': 水平分割线
 */
function insertMarkdown(action) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    const beforeText = editor.value.substring(0, start);
    const afterText = editor.value.substring(end);
    
    let newText = '';
    let cursorOffset = 0;
    
    switch(action) {
        case 'bold':
            newText = `**${selectedText || '粗体文本'}**`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'italic':
            newText = `*${selectedText || '斜体文本'}*`;
            cursorOffset = selectedText ? newText.length : 1;
            break;
        case 'strikethrough':
            newText = `~~${selectedText || '删除线文本'}~~`;
            cursorOffset = selectedText ? newText.length : 2;
            break;
        case 'h1':
            newText = `# ${selectedText || '标题1'}`;
            cursorOffset = newText.length;
            break;
        case 'h2':
            newText = `## ${selectedText || '标题2'}`;
            cursorOffset = newText.length;
            break;
        case 'h3':
            newText = `### ${selectedText || '标题3'}`;
            cursorOffset = newText.length;
            break;
        case 'ul':
            newText = `- ${selectedText || '列表项'}`;
            cursorOffset = newText.length;
            break;
        case 'ol':
            newText = `1. ${selectedText || '列表项'}`;
            cursorOffset = newText.length;
            break;
        case 'checkbox':
            newText = `- [ ] ${selectedText || '待办事项'}`;
            cursorOffset = newText.length;
            break;
        case 'code':
            newText = `\`${selectedText || '代码'}\``;
            cursorOffset = selectedText ? newText.length : 1;
            break;
        case 'codeblock':
            newText = `\`\`\`${selectedText ? '' : 'javascript'}\n${selectedText || '代码内容'}\n\`\`\``;
            cursorOffset = newText.length - 4;
            break;
        case 'quote':
            newText = `> ${selectedText || '引用内容'}`;
            cursorOffset = newText.length;
            break;
        case 'link':
            newText = `[${selectedText || '链接文本'}](url)`;
            cursorOffset = selectedText ? newText.length - 4 : 1;
            break;
        case 'image':
            newText = `![${selectedText || '图片描述'}](image_url)`;
            cursorOffset = selectedText ? newText.length - 9 : 2;
            break;
        case 'table':
            newText = `| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |`;
            cursorOffset = newText.length;
            break;
        case 'hr':
            newText = '\n---\n';
            cursorOffset = newText.length;
            break;
    }
    
    editor.value = beforeText + newText + afterText;
    editor.focus();
    
    // 设置光标位置
    const newCursorPos = start + cursorOffset;
    editor.setSelectionRange(newCursorPos, newCursorPos);
    
    // 触发input事件更新预览
    editor.dispatchEvent(new Event('input'));
}

// 快捷键支持 - 快速编辑
editor.addEventListener('keydown', function(e) {
    // Ctrl+B: 粗体
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        insertMarkdown('bold');
    }
    // Ctrl+I: 斜体
    if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        insertMarkdown('italic');
    }
    // Ctrl+K: 代码
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        insertMarkdown('code');
    }
    // Ctrl+L: 链接
    if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        insertMarkdown('link');
    }
    // Tab键：插入4个空格
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const beforeText = editor.value.substring(0, start);
        const afterText = editor.value.substring(end);
        
        editor.value = beforeText + '    ' + afterText;
        editor.focus();
        editor.setSelectionRange(start + 4, start + 4);
        editor.dispatchEvent(new Event('input'));
    }
});

// 保存为HTML格式
document.getElementById('save-html-btn').addEventListener('click', function() {
    const htmlContent = preview.innerHTML;
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.8;
            color: #333;
        }
        h1, h2, h3, h4 {
            margin-top: 24px;
            margin-bottom: 16px;
        }
        h1 { font-size: 32px; border-bottom: 2px solid #e5e5e5; padding-bottom: 8px; }
        h2 { font-size: 24px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
        h3 { font-size: 20px; }
        h4 { font-size: 16px; }
        p { margin: 8px 0; }
        ul, ol { margin: 8px 0; padding-left: 24px; }
        li { margin: 4px 0; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-family: 'Consolas', 'Monaco', monospace; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 8px; overflow-x: auto; }
        pre code { background: none; padding: 0; }
        blockquote { border-left: 4px solid #ddd; padding-left: 16px; margin: 12px 0; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #e5e5e5; padding: 8px 12px; text-align: left; }
        th { background: #fafafa; }
        img { max-width: 100%; border-radius: 8px; }
        hr { border: none; border-top: 1px solid #e5e5e5; margin: 16px 0; }
        a { color: #333; text-decoration: underline; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'document-' + Date.now() + '.html';
    link.click();
    URL.revokeObjectURL(link.href);
    
    savedFileCount++;
    localStorage.setItem('savedFileCount', savedFileCount);
    updateStats();
});

// 保存为Markdown格式
document.getElementById('save-md-btn').addEventListener('click', function() {
    const markdownContent = editor.value;
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'document-' + Date.now() + '.md';
    link.click();
    URL.revokeObjectURL(link.href);
    
    savedFileCount++;
    localStorage.setItem('savedFileCount', savedFileCount);
    updateStats();
});

// 日期时间插入功能
const datetimeBtn = document.getElementById('datetime-btn');

if (datetimeBtn) {
    datetimeBtn.addEventListener('click', function() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const datetimeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const beforeText = editor.value.substring(0, start);
        const afterText = editor.value.substring(end);
        
        editor.value = beforeText + datetimeStr + afterText;
        editor.focus();
        editor.setSelectionRange(start + datetimeStr.length, start + datetimeStr.length);
        editor.dispatchEvent(new Event('input'));
        
        showToast('已插入日期时间');
    });
}

// 导入Markdown文件功能
const importMdBtn = document.getElementById('import-md-btn');
const mdFileInput = document.getElementById('md-file-input');

importMdBtn.addEventListener('click', function() {
    mdFileInput.click();
});

mdFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            editor.value = event.target.result;
            preview.innerHTML = marked.parse(event.target.result);
            showToast(`已导入文件: ${file.name}`);
        };
        reader.readAsText(file);
    }
    // 清空文件输入，允许重复导入同一文件
    mdFileInput.value = '';
});

// 复制预览内容功能
document.getElementById('copy-preview-btn').addEventListener('click', function() {
    const previewContent = document.getElementById('preview').innerHTML;
    
    // 创建一个临时div来包裹内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = previewContent;
    
    // 使用clipboard API复制HTML内容
    const clipboardItem = new ClipboardItem({
        'text/html': new Blob([previewContent], { type: 'text/html' }),
        'text/plain': new Blob([tempDiv.textContent], { type: 'text/plain' })
    });
    
    navigator.clipboard.write([clipboardItem]).then(() => {
        showToast('预览内容已复制');
    }).catch(() => {
        // 如果clipboard API失败，使用传统方法
        const range = document.createRange();
        range.selectNode(document.getElementById('preview'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        showToast('预览内容已复制');
    });
});

// 字数统计功能 (优化版 - 使用防抖)
const debouncedUpdateWordCount = debounce(() => {
    const content = editor.value;
    const words = content.length;
    const paragraphs = content.split('\n').filter(p => p.trim()).length;
    
    const wordCountInfo = document.getElementById('word-count');
    if (wordCountInfo) {
        wordCountInfo.textContent = `${words} 字 · ${paragraphs} 段落`;
    }
}, 300);

// 监听编辑器输入更新字数统计
editor.addEventListener('input', debouncedUpdateWordCount);
debouncedUpdateWordCount(); // 初始化字数统计

// 拖拽调整面板宽度功能
const resizer1 = document.getElementById('resizer-1');
const resizer2 = document.getElementById('resizer-2');
const leftPanel = document.querySelector('.left-panel');
const centerPanel = document.querySelector('.center-panel');
const rightPanel = document.querySelector('.right-panel');
const container = document.querySelector('.container');

let isResizing = false;
let currentResizer = null;
let startX = 0;
let startLeftWidth = 0;
let startCenterWidth = 0;

// 保存面板宽度到localStorage
/**
 * 保存面板宽度到 localStorage
 * 
 * 将左侧和中间面板的当前宽度保存到 localStorage，以便在下次访问时恢复。
 */
function savePanelWidths() {
    localStorage.setItem('leftPanelWidth', leftPanel.style.flexBasis);
    localStorage.setItem('centerPanelWidth', centerPanel.style.flexBasis);
}

/**
 * 从 localStorage 加载保存的面板宽度
 * 
 * 恢复上次保存的面板宽度设置。如果未保存过，则使用默认宽度（三等分）。
 * 右侧面板会自动填充剩余空间。
 */
function loadPanelWidths() {
    const savedLeftWidth = localStorage.getItem('leftPanelWidth');
    const savedCenterWidth = localStorage.getItem('centerPanelWidth');
    const containerWidth = container.clientWidth;
    
    // 初始化默认宽度（三块区域均衡）
    const resizerWidth = 10;
    const defaultPanelWidth = (containerWidth - 2 * resizerWidth) / 3;
    
    if (!savedLeftWidth) {
        leftPanel.style.flex = '0 0 auto';
        leftPanel.style.flexBasis = defaultPanelWidth + 'px';
    } else {
        leftPanel.style.flex = '0 0 auto';
        leftPanel.style.flexBasis = savedLeftWidth;
    }
    
    if (!savedCenterWidth) {
        centerPanel.style.flex = '0 0 auto';
        centerPanel.style.flexBasis = defaultPanelWidth + 'px';
    } else {
        centerPanel.style.flex = '0 0 auto';
        centerPanel.style.flexBasis = savedCenterWidth;
    }
    
    // rightPanel 自动填充剩余空间，确保三等分
    rightPanel.style.flex = '1';
    rightPanel.style.flexBasis = 'auto';
    rightPanel.style.minWidth = '260px';
}

// 拖拽处理函数
/**
 * 处理面板拖拽调整的开始事件
 * 
 * 当用户按下分割线时初始化拖拽状态，记录初始位置和宽度。
 * 
 * @param {MouseEvent} e - 鼠标事件对象
 * @param {HTMLElement} resizer - 被拖拽的分割线元素
 */
function handleMouseDown(e, resizer) {
    isResizing = true;
    currentResizer = resizer;
    startX = e.clientX;
    startLeftWidth = leftPanel.offsetWidth;
    startCenterWidth = centerPanel.offsetWidth;
    
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    // 优化渲染性能
    container.style.willChange = 'flex-basis';
}

/**
 * 处理面板拖拽过程中的鼠标移动事件
 * 
 * 根据鼠标移动距离调整相应面板的宽度。
 * 使用 requestAnimationFrame 优化渲染性能。
 * 
 * @param {MouseEvent} e - 鼠标事件对象
 */
function handleMouseMove(e) {
    if (!isResizing) return;
    
    requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        
        if (currentResizer === resizer1) {
            const newLeftWidth = startLeftWidth + deltaX;
            leftPanel.style.flexBasis = newLeftWidth + 'px';
        } else if (currentResizer === resizer2) {
            const newCenterWidth = startCenterWidth + deltaX;
            centerPanel.style.flexBasis = newCenterWidth + 'px';
        }
    });
}

/**
 * 处理面板拖拽结束事件
 * 
 * 清理拖拽状态，保存新的面板宽度到 localStorage。
 */
function handleMouseUp() {
    if (isResizing) {
        isResizing = false;
        if (currentResizer) {
            currentResizer.classList.remove('resizing');
        }
        currentResizer = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        container.style.willChange = '';
        savePanelWidths();
    }
}

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 确保元素存在
    if (resizer1 && resizer2 && leftPanel && centerPanel) {
        loadPanelWidths();
        
        // 绑定拖拽事件
        resizer1.addEventListener('mousedown', (e) => handleMouseDown(e, resizer1));
        resizer2.addEventListener('mousedown', (e) => handleMouseDown(e, resizer2));
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
});

// ========================================
// 工具切换功能
// ========================================
// 优化：使用事件委托优化工具切换性能
const toolSelector = document.querySelector('.tool-selector');
const toolPanels = document.querySelectorAll('.tool-panel');

// 设置按钮点击事件 - 切换到设置面板
if (settingsToggle) {
    settingsToggle.addEventListener('click', function() {
        // 隐藏所有工具面板
        toolPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        // 取消所有工具按钮的激活状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 显示设置面板
        const settingsPanel = document.getElementById('settings');
        if (settingsPanel) {
            settingsPanel.classList.add('active');
        }
    });
}

// 使用事件委托处理工具切换
toolSelector.addEventListener('click', function(e) {
    const btn = e.target.closest('.tool-btn');
    if (!btn) return;
    
    // 添加涟漪效果
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // 移除所有活动状态
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    toolPanels.forEach(p => p.classList.remove('active'));

    // 添加当前活动状态
    btn.classList.add('active');
    const toolId = btn.getAttribute('data-tool');
    const toolPanel = document.getElementById(toolId);
    if (toolPanel) {
        toolPanel.classList.add('active');
    }
});

// ========================================
// 工具面板功能
// ========================================

// 计算器功能
const calcDisplay = document.getElementById('calc-display');
let currentValue = '0';
let previousValue = '';
let operator = '';
let shouldResetDisplay = false;

// 优化：使用事件委托，减少事件监听器数量
document.querySelector('.calculator-buttons').addEventListener('click', function(e) {
    const btn = e.target.closest('.calc-btn');
    if (!btn) return;
    
    const value = btn.getAttribute('data-value');
    const action = btn.getAttribute('data-action');

    if (value !== null) {
        handleNumber(value);
    } else if (action) {
        handleAction(action);
    }
    
    // 添加点击动画
    btn.style.animation = 'none';
    btn.offsetHeight; // 触发重绘
    btn.style.animation = 'pulse 0.3s ease';
});

/**
 * 处理计算器数字输入
 * 
 * @param {string} num - 输入的数字字符
 * 
 * 如果是运算后的第一个输入，则替换当前显示值；
 * 否则追加到当前显示值末尾（除非当前是0）。
 */
function handleNumber(num) {
    if (shouldResetDisplay) {
        currentValue = num;
        shouldResetDisplay = false;
    } else {
        currentValue = currentValue === '0' ? num : currentValue + num;
    }
    updateDisplay();
}

/**
 * 处理计算器操作按钮点击
 * 
 * @param {string} action - 操作类型，可选值：
 *   - 'clear': 清除所有
 *   - 'backspace': 删除最后一位
 *   - 'percent': 百分比转换
 *   - 'decimal': 小数点
 *   - 'add': 加法
 *   - 'subtract': 减法
 *   - 'multiply': 乘法
 *   - 'divide': 除法
 *   - 'equals': 等号
 */
function handleAction(action) {
    switch (action) {
        case 'clear':
            currentValue = '0';
            previousValue = '';
            operator = '';
            break;
        case 'backspace':
            currentValue = currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
            break;
        case 'percent':
            currentValue = String(parseFloat(currentValue) / 100);
            break;
        case 'decimal':
            if (!currentValue.includes('.')) {
                currentValue += '.';
            }
            break;
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
            if (previousValue !== '' && operator !== '') {
                calculate();
            }
            previousValue = currentValue;
            operator = action;
            shouldResetDisplay = true;
            break;
        case 'equals':
            if (previousValue !== '' && operator !== '') {
                calculate();
                previousValue = '';
                operator = '';
            }
            break;
    }
    updateDisplay();
}

/**
 * 执行计算器计算
 * 
 * 根据保存的运算符对前一个值和当前值进行计算。
 * 如果除数为0，则返回 'Error'。
 */
function calculate() {
    const prev = parseFloat(previousValue);
    const current = parseFloat(currentValue);
    let result;

    switch (operator) {
        case 'add':
            result = prev + current;
            break;
        case 'subtract':
            result = prev - current;
            break;
        case 'multiply':
            result = prev * current;
            break;
        case 'divide':
            result = current !== 0 ? prev / current : 'Error';
            break;
    }

    currentValue = String(result);
    shouldResetDisplay = true;
}

/**
 * 更新计算器显示
 * 
 * 将当前值显示在计算器的显示屏上。
 */
function updateDisplay() {
    calcDisplay.value = currentValue;
}

// 画板功能
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const brushColor = document.getElementById('brush-color');
const brushSize = document.getElementById('brush-size');
const brushSizeValue = document.getElementById('brush-size-value');
const clearCanvasBtn = document.getElementById('clear-canvas');
const saveCanvasBtn = document.getElementById('save-canvas');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// 离屏 Canvas 缓冲区，优化绘图性能
let offscreenCanvas = null;
let offscreenCtx = null;

// 初始化离屏 Canvas
function initOffscreenCanvas() {
    offscreenCanvas = document.createElement('canvas');
    offscreenCtx = offscreenCanvas.getContext('2d');
}

// 设置画布大小
/**
 * 调整画布大小以适应容器
 * 
 * 根据父容器的大小计算画布的最佳尺寸，并设置白色背景。
 * 画布高度最小为200px。
 * 使用离屏 Canvas 缓存现有内容，避免调整大小时丢失。
 */
function resizeCanvas() {
    const container = canvas.parentElement;
    const toolbarHeight = document.querySelector('.canvas-toolbar').offsetHeight;
    const padding = 24;
    const containerHeight = container.clientHeight;
    
    // 计算可用高度
    const availableHeight = containerHeight - toolbarHeight - padding;
    
    // 保存现有内容
    let existingImageData = null;
    if (canvas.width > 0 && canvas.height > 0) {
        existingImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    // 设置画布尺寸
    const newWidth = container.clientWidth - padding;
    const newHeight = Math.max(availableHeight, 200);
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // 设置白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 恢复现有内容
    if (existingImageData) {
        ctx.putImageData(existingImageData, 0, 0);
    }
    
    // 初始化离屏 Canvas
    if (!offscreenCanvas) {
        initOffscreenCanvas();
    }
    offscreenCanvas.width = newWidth;
    offscreenCanvas.height = newHeight;
}

// 初始化画布
initOffscreenCanvas();
resizeCanvas();

// 防抖优化 resize 事件
const debouncedResizeCanvas = debounce(resizeCanvas, 100);
window.addEventListener('resize', debouncedResizeCanvas);

// 当切换到画板时重新调整大小
const toolSelectorCanvas = document.querySelector('.tool-selector');
if (toolSelectorCanvas) {
    toolSelectorCanvas.addEventListener('click', function(e) {
        const btn = e.target.closest('.tool-btn');
        if (btn && btn.getAttribute('data-tool') === 'canvas') {
            setTimeout(resizeCanvas, 100);
        }
    });
}

// 更新画笔大小显示
brushSize.addEventListener('input', function() {
    brushSizeValue.textContent = this.value;
});

// 绘图函数 (优化版 - 使用离屏 Canvas 和 requestAnimationFrame)
/**
 * 开始绘制
 * 
 * 当鼠标或触摸按下时，记录起始坐标并设置绘制状态。
 * 
 * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
 */
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
}

// 绘制请求队列，优化性能
let drawRequests = [];
let isProcessingDraw = false;

/**
 * 处理绘制队列
 */
function processDrawQueue() {
    if (drawRequests.length === 0) {
        isProcessingDraw = false;
        return;
    }
    
    isProcessingDraw = true;
    const request = drawRequests.shift();
    
    const [x, y] = request.coordinates;
    
    // 在离屏 Canvas 上绘制
    offscreenCtx.beginPath();
    offscreenCtx.moveTo(lastX, lastY);
    offscreenCtx.lineTo(x, y);
    offscreenCtx.strokeStyle = brushColor.value;
    offscreenCtx.lineWidth = brushSize.value;
    offscreenCtx.lineCap = 'round';
    offscreenCtx.lineJoin = 'round';
    offscreenCtx.stroke();
    
    // 同步到主 Canvas
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = brushColor.value;
    ctx.lineWidth = brushSize.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    [lastX, lastY] = [x, y];
    
    requestAnimationFrame(processDrawQueue);
}

/**
 * 绘制线条
 * 
 * 在画布上从上一个点到当前点绘制线条。
 * 使用离屏 Canvas 和请求队列优化渲染性能。
 * 
 * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
 */
function draw(e) {
    if (!isDrawing) return;
    
    const coordinates = getCoordinates(e);
    
    // 添加到绘制队列
    drawRequests.push({ coordinates });
    
    if (!isProcessingDraw) {
        processDrawQueue();
    }
}

/**
 * 停止绘制
 * 
 * 当鼠标或触摸释放时，清除绘制状态。
 */
function stopDrawing() {
    isDrawing = false;
    drawRequests = [];
}

/**
 * 获取鼠标或触摸相对于画布的坐标
 * 
 * @param {MouseEvent|TouchEvent} e - 鼠标或触摸事件对象
 * @returns {number[]} [x, y] 坐标数组
 */
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
        return [
            e.touches[0].clientX - rect.left,
            e.touches[0].clientY - rect.top
        ];
    }
    return [
        e.clientX - rect.left,
        e.clientY - rect.top
    ];
}

// 鼠标事件
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// 触摸事件
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    startDrawing(e);
});
canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    draw(e);
});
canvas.addEventListener('touchend', stopDrawing);

// 清空画布
clearCanvasBtn.addEventListener('click', function() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// 保存画布为PNG
saveCanvasBtn.addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = 'drawing-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// 键盘快捷键支持（计算器）
// 已合并到统一的键盘事件处理器中（见代码末尾）

// 时钟功能
// 优化：缓存DOM元素引用，减少频繁的DOM查询
const clockElements = {
    digitalClock: null,
    dateDisplay: null,
    worldClocks: {}
};

let lastUpdateTime = '';

/**
 * 更新时钟显示
 * 
 * 更新本地数字时钟、日期显示以及所有世界时钟。
 * 使用缓存优化性能，只在秒数变化时更新。
 */
function updateClock() {
    const now = new Date();
    
    // 优化：只在秒数变化时更新
    const currentTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    if (currentTime === lastUpdateTime) {
        return;
    }
    lastUpdateTime = currentTime;
    
    // 延迟初始化DOM元素缓存（只在时钟面板可见时）
    if (!clockElements.digitalClock) {
        clockElements.digitalClock = document.getElementById('digital-clock');
        clockElements.dateDisplay = document.getElementById('date-display');
        clockElements.worldClocks.beijing = document.getElementById('clock-beijing');
        clockElements.worldClocks.newyork = document.getElementById('clock-newyork');
        clockElements.worldClocks.london = document.getElementById('clock-london');
        clockElements.worldClocks.tokyo = document.getElementById('clock-tokyo');
    }
    
    // 更新本地时钟
    if (clockElements.digitalClock) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clockElements.digitalClock.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    // 更新日期（只在日期变化时更新）
    if (clockElements.dateDisplay) {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        clockElements.dateDisplay.textContent = `${year}-${month}-${day}`;
    }
    
    // 更新世界时钟
    updateWorldClock(clockElements.worldClocks.beijing, 8);
    updateWorldClock(clockElements.worldClocks.newyork, -5);
    updateWorldClock(clockElements.worldClocks.london, 0);
    updateWorldClock(clockElements.worldClocks.tokyo, 9);
}

/**
 * 更新世界时钟显示
 * 
 * 根据时区偏移量计算并显示指定城市的时间。
 * 
 * @param {HTMLElement} element - 要更新的显示元素
 * @param {number} offset - UTC时区偏移量（小时），如北京为+8，纽约为-5
 */
function updateWorldClock(element, offset) {
    if (!element) return;
    
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTime = new Date(utc + (3600000 * offset));
    const hours = String(cityTime.getHours()).padStart(2, '0');
    const minutes = String(cityTime.getMinutes()).padStart(2, '0');
    const seconds = String(cityTime.getSeconds()).padStart(2, '0');
    element.textContent = `${hours}:${minutes}:${seconds}`;
}

// 每秒更新时钟 (优化版 - 使用 requestAnimationFrame)
/**
 * 启动时钟
 * 
 * 开始时钟更新循环，每秒更新一次显示。
 * 使用 requestAnimationFrame 和 setTimeout 实现精确的每秒更新。
 */
function startClock() {
    updateClock();
    requestAnimationFrame(function tick() {
        updateClock();
        setTimeout(() => requestAnimationFrame(tick), 1000);
    });
}

startClock();

// 待办事项功能
const todoInput = document.getElementById('todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const todoList = document.getElementById('todo-list');
const todoCount = document.getElementById('todo-count');
const clearCompletedBtn = document.getElementById('clear-completed-btn');

let todos = JSON.parse(localStorage.getItem('todos')) || [];

// 优化：使用防抖减少频繁的 localStorage 写入
const debouncedSaveTodos = debounce(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
}, 300);

/**
 * 保存待办事项到 localStorage
 * 
 * 使用防抖函数减少频繁的 localStorage 写入。
 */
function saveTodos() {
    debouncedSaveTodos();
}

/**
 * 渲染待办事项列表
 * 
 * 将 todos 数组渲染到页面上，包括复选框状态和删除按钮。
 * 优化：使用 DocumentFragment 减少重排，批量更新 DOM。
 */
function renderTodos() {
    const todoList = document.getElementById('todo-list');
    
    // 使用 DocumentFragment 优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    if (todos.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.setAttribute('role', 'status');
        emptyState.innerHTML = `
            <div class="empty-state-icon" aria-hidden="true">📋</div>
            <div class="empty-state-text">暂无任务</div>
            <div class="empty-state-hint">在上方输入框添加新任务</div>
        `;
        fragment.appendChild(emptyState);
    } else {
        todos.forEach((todo, index) => {
            const todoItem = document.createElement('div');
            todoItem.className = 'todo-item';
            if (todo.completed) {
                todoItem.classList.add('completed');
            }
            
            // 使用 createElement 代替 innerHTML 减少解析开销
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.dataset.id = todo.id;
            checkbox.checked = todo.completed;
            checkbox.setAttribute('aria-label', '标记任务完成状态');
            
            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'todo-delete';
            deleteBtn.dataset.id = todo.id;
            deleteBtn.textContent = '✕';
            deleteBtn.setAttribute('aria-label', '删除任务');
            
            todoItem.appendChild(checkbox);
            todoItem.appendChild(textSpan);
            todoItem.appendChild(deleteBtn);
            
            fragment.appendChild(todoItem);
        });
    }
    
    // 一次性替换所有内容，减少重排
    while (todoList.firstChild) {
        todoList.removeChild(todoList.firstChild);
    }
    todoList.appendChild(fragment);
    
    updateTodoCount();
}

/**
 * 更新待办事项计数
 * 
 * 计算未完成的待办事项数量并更新显示。
 */
function updateTodoCount() {
    const activeTodos = todos.filter(t => !t.completed).length;
    todoCount.textContent = `${activeTodos} 个待完成`;
}

/**
 * 添加新的待办事项
 * 
 * 从输入框获取文本，创建新的待办事项并添加到列表顶部。
 * 清空输入框并触发重新渲染。
 */
function addTodo() {
    const text = todoInput.value.trim();
    if (text) {
        todos.unshift({ text, completed: false });
        saveTodos();
        renderTodos();
        todoInput.value = '';
        
        // 为新添加的待办事项添加动画
        const firstTodo = todoList.querySelector('.todo-item');
        if (firstTodo) {
            firstTodo.style.animation = 'none';
            firstTodo.offsetHeight;
            firstTodo.style.animation = 'slideIn 0.4s ease-out';
        }
    }
}

// 窗口大小改变时自适应调整
window.addEventListener('resize', debounce(() => {
    const containerWidth = container.clientWidth;
    
    // 如果保存的宽度超出容器，则重置为默认宽度
    const savedLeftWidth = localStorage.getItem('leftPanelWidth');
    const savedCenterWidth = localStorage.getItem('centerPanelWidth');
    
    if (savedLeftWidth) {
        const leftWidth = parseInt(savedLeftWidth);
        if (leftWidth > containerWidth * 0.5) {
            const newWidth = Math.min(300, containerWidth * 0.3);
            leftPanel.style.flexBasis = newWidth + 'px';
            localStorage.setItem('leftPanelWidth', newWidth + 'px');
        }
    }
    
    if (savedCenterWidth) {
        const centerWidth = parseInt(savedCenterWidth);
        if (centerWidth > containerWidth * 0.6) {
            const newWidth = Math.min(500, containerWidth * 0.4);
            centerPanel.style.flexBasis = newWidth + 'px';
            localStorage.setItem('centerPanelWidth', newWidth + 'px');
        }
    }
    
    // 调整画布大小
    if (canvas) {
        setTimeout(resizeCanvas, 100);
    }
}, 300));

addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addTodo();
});

todoList.addEventListener('click', function(e) {
    if (e.target.classList.contains('todo-checkbox')) {
        const index = e.target.dataset.index;
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
    } else if (e.target.classList.contains('todo-delete')) {
        const index = e.target.dataset.index;
        todos.splice(index, 1);
        saveTodos();
        renderTodos();
    }
});

clearCompletedBtn.addEventListener('click', function() {
    todos = todos.filter(t => !t.completed);
    saveTodos();
    renderTodos();
});

// 待办事项导出功能
const exportTodosBtn = document.getElementById('export-todos-btn');

if (exportTodosBtn) {
    exportTodosBtn.addEventListener('click', function() {
        if (todos.length === 0) {
            showToast('没有待办事项可导出');
            return;
        }
        
        let markdown = '# 待办事项\n\n';
        
        const activeTodos = todos.filter(t => !t.completed);
        const completedTodos = todos.filter(t => t.completed);
        
        if (activeTodos.length > 0) {
            markdown += '## 待完成\n';
            activeTodos.forEach((todo, index) => {
                markdown += `- [ ] ${todo.text}\n`;
            });
            markdown += '\n';
        }
        
        if (completedTodos.length > 0) {
            markdown += '## 已完成\n';
            completedTodos.forEach((todo, index) => {
                markdown += `- [x] ${todo.text}\n`;
            });
            markdown += '\n';
        }
        
        markdown += `\n---\n导出时间: ${new Date().toLocaleString()}\n`;
        
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'todos-' + Date.now() + '.md';
        link.click();
        URL.revokeObjectURL(link.href);
        
        showToast(`已导出 ${todos.length} 个待办事项`);
    });
}

renderTodos();

// 便签功能
const addNoteBtn = document.getElementById('add-note-btn');
const clearNotesBtn = document.getElementById('clear-notes-btn');
const notesContainer = document.getElementById('notes-container');

let notes = JSON.parse(localStorage.getItem('notes')) || [];
let resizeObserver = null;
let dragState = {
    isDragging: false,
    noteCard: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
};

// 优化：使用防抖减少频繁的 localStorage 写入
const debouncedSaveNotes = debounce(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
}, 300);

/**
 * 保存便签到 localStorage
 * 
 * 使用防抖函数减少频繁的 localStorage 写入。
 */
function saveNotes() {
    debouncedSaveNotes();
}

/**
 * 渲染便签列表
 * 
 * 将 notes 数组渲染到页面上，支持拖拽定位。
 * 优化：使用 DocumentFragment 减少重排，批量更新 DOM。
 */
function renderNotes() {
    const notesContainer = document.getElementById('notes-container');
    
    // 使用 DocumentFragment 优化 DOM 操作
    const fragment = document.createDocumentFragment();
    
    if (notes.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.setAttribute('role', 'status');
        emptyState.innerHTML = `
            <div class="empty-state-icon" aria-hidden="true">📝</div>
            <div class="empty-state-text">暂无便签</div>
            <div class="empty-state-hint">点击"新建便签"开始记录</div>
        `;
        fragment.appendChild(emptyState);
    } else {
        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            noteCard.dataset.id = note.id;
            
            // 设置位置（如果有保存的位置）
            if (note.position) {
                noteCard.style.left = note.position.x + 'px';
                noteCard.style.top = note.position.y + 'px';
            }
            
            // 使用 createElement 代替 innerHTML 减少解析开销
            const header = document.createElement('div');
            header.className = 'note-header';
            
            const titleSpan = document.createElement('span');
            titleSpan.className = 'note-title';
            titleSpan.textContent = '便签';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'note-delete';
            deleteBtn.dataset.id = note.id;
            deleteBtn.textContent = '✕';
            deleteBtn.setAttribute('aria-label', '删除便签');
            
            header.appendChild(titleSpan);
            header.appendChild(deleteBtn);
            
            const textarea = document.createElement('textarea');
            textarea.className = 'note-textarea';
            textarea.dataset.id = note.id;
            textarea.placeholder = '输入内容...';
            textarea.setAttribute('aria-label', '便签内容');
            textarea.textContent = note.text;
            
            noteCard.appendChild(header);
            noteCard.appendChild(textarea);
            
            fragment.appendChild(noteCard);
        });
    }
    
    // 一次性替换所有内容，减少重排
    while (notesContainer.firstChild) {
        notesContainer.removeChild(notesContainer.firstChild);
    }
    notesContainer.appendChild(fragment);
    
    // 使便签可拖拽
    makeNotesDraggable();
}



/**
 * 添加新便签
 * 
 * 在功能区容器的左上角创建一个新的空便签。
 * 自动聚焦到新便签的文本输入框。
 */
function addNote() {
    // 获取功能区容器的位置
    const containerRect = notesContainer.getBoundingClientRect();
    
    const newNote = {
        id: Date.now(),
        text: '',
        position: { 
            x: containerRect.left + 20,
            y: containerRect.top + 20
        },
        size: { width: 200, height: 150 }
    };
    notes.unshift(newNote);
    saveNotes();
    renderNotes();
    
    // 自动聚焦到新创建的便签
    setTimeout(() => {
        const allNotes = document.querySelectorAll('.note-card');
        if (allNotes.length > 0) {
            const newTextarea = allNotes[0].querySelector('.note-textarea');
            if (newTextarea) {
                newTextarea.focus();
            }
        }
    }, 100);
}

addNoteBtn.addEventListener('click', addNote);

// 使便签可拖拽
/**
 * 使便签可拖拽
 * 
 * 为每个便签卡片的头部添加鼠标拖拽事件监听器，
 * 允许用户在页面上自由移动便签位置。
 */
function makeNotesDraggable() {
    const noteCards = document.querySelectorAll('.note-card');
    
    noteCards.forEach(noteCard => {
        const header = noteCard.querySelector('.note-header');
        
        // 使用函数引用，避免重复添加监听器
        const handleMouseDown = (e) => {
            if (e.target.classList.contains('note-delete')) return;
            
            dragState.isDragging = true;
            dragState.noteCard = noteCard;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            
            const rect = noteCard.getBoundingClientRect();
            
            // 计算初始位置
            dragState.initialX = rect.left;
            dragState.initialY = rect.top;
            
            noteCard.classList.add('dragging');
            e.preventDefault();
        };
        
        header.addEventListener('mousedown', handleMouseDown);
    });
}

// 全局拖拽事件监听器（单例模式）
document.addEventListener('mousemove', (e) => {
    if (!dragState.isDragging || !dragState.noteCard) return;
    
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    
    const newX = dragState.initialX + dx;
    const newY = dragState.initialY + dy;
    
    // 全局拖动，不限制边界
    dragState.noteCard.style.left = newX + 'px';
    dragState.noteCard.style.top = newY + 'px';
});

document.addEventListener('mouseup', () => {
    if (!dragState.isDragging || !dragState.noteCard) return;
    
    dragState.isDragging = false;
    dragState.noteCard.classList.remove('dragging');
    
    // 保存便签位置
    const noteId = dragState.noteCard.dataset.id;
    const note = notes.find(n => n.id == noteId);
    if (note) {
        note.position = {
            x: parseInt(dragState.noteCard.style.left),
            y: parseInt(dragState.noteCard.style.top)
        };
        saveNotes();
    }
    
    dragState.noteCard = null;
});

// 便签内容保存 (优化版 - 使用防抖)
const debouncedSaveNote = debounce(function(e) {
    if (e.target.classList.contains('note-textarea')) {
        const id = e.target.dataset.id;
        const note = notes.find(n => n.id == id);
        if (note) {
            note.text = e.target.value;
            saveNotes();
        }
    }
}, 500);

document.body.addEventListener('input', debouncedSaveNote);

document.body.addEventListener('click', function(e) {
    if (e.target.classList.contains('note-delete')) {
        const id = e.target.dataset.id;
        notes = notes.filter(n => n.id != id);
        saveNotes();
        renderNotes();
    }
});

clearNotesBtn.addEventListener('click', function() {
    if (confirm('确定要清空所有便签吗？')) {
        notes = [];
        saveNotes();
        renderNotes();
    }
});

renderNotes();

// 颜色转换器功能
const colorPicker = document.getElementById('color-picker');
const colorPreviewBox = document.getElementById('color-preview-box');
const colorHex = document.getElementById('color-hex');
const colorRgb = document.getElementById('color-rgb');
const colorHsl = document.getElementById('color-hsl');
const colorPalette = document.querySelector('.color-palette');

// 确保所有元素都存在
if (!colorPicker || !colorPreviewBox || !colorHex || !colorRgb || !colorHsl) {
    console.error('颜色转换器元素未找到');
}

// 优化：使用事件委托处理颜色预设点击
if (colorPalette) {
    colorPalette.addEventListener('click', function(e) {
        const preset = e.target.closest('.color-preset');
        if (preset) {
            const color = preset.dataset.color;
            updateColorInputs(color);
        }
    });
}

/**
 * 将 HEX 颜色转换为 RGB 格式
 * 
 * @param {string} hex - HEX 格式的颜色值，如 '#ff0000' 或 'ff0000'
 * @returns {Object|null} RGB 对象 {r, g, b} 或 null（如果格式无效）
 * 
 * @example
 * hexToRgb('#ff0000') // {r: 255, g: 0, b: 0}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * 将 RGB 颜色转换为 HSL 格式
 * 
 * @param {number} r - 红色分量 (0-255)
 * @param {number} g - 绿色分量 (0-255)
 * @param {number} b - 蓝色分量 (0-255)
 * @returns {Object} HSL 对象 {h, s, l}，其中 h 为角度(0-360)，s 和 l 为百分比(0-100)
 * 
 * @example
 * rgbToHsl(255, 0, 0) // {h: 0, s: 100, l: 50}
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

/**
 * 更新颜色转换器的所有输入框显示
 * 
 * 根据 HEX 颜色值计算并更新 RGB 和 HSL 显示。
 * 
 * @param {string} hex - HEX 格式的颜色值
 * @param {boolean} updateHexInput - 是否更新 HEX 输入框的值
 */
function updateColorInputs(hex, updateHexInput = true) {
    const rgb = hexToRgb(hex);
    if (rgb) {
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        if (updateHexInput) {
            colorHex.value = hex.toUpperCase();
        }
        colorRgb.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        colorHsl.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        colorPreviewBox.style.background = hex;
        colorPicker.value = hex;
        colorHex.style.borderColor = '#e5e5e5';
    } else {
        colorHex.style.borderColor = '#ff0000';
    }
}

colorPicker.addEventListener('input', function() {
    updateColorInputs(this.value);
});

colorHex.addEventListener('input', function() {
    let hex = this.value;
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        updateColorInputs(hex, false);
    } else if (/^#[0-9A-Fa-f]{0,6}$/i.test(hex)) {
        // 部分输入，只显示颜色预览
        const rgb = hexToRgb(hex.padEnd(7, '0'));
        if (rgb) {
            colorPreviewBox.style.background = hex;
            colorHex.style.borderColor = '#e5e5e5';
        }
    }
});

colorHex.addEventListener('blur', function() {
    let hex = this.value;
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
        updateColorInputs(hex);
    }
});

// 初始化颜色预设背景色
const colorPresets = document.querySelectorAll('.color-preset');
colorPresets.forEach(preset => {
    const color = preset.dataset.color;
    preset.style.backgroundColor = color;
});

// 初始化颜色
updateColorInputs('#000000');

// 键盘快捷键支持（工具切换）
// 已合并到统一的键盘事件处理器中（见代码末尾）

/**
 * 显示 Toast 提示消息
 * 
 * 在页面右上角显示一个临时的提示消息，自动在指定时间后消失。
 * 如果已有提示消息存在，则先移除旧的提示。
 * 
 * @param {string} message - 要显示的消息内容
 * @param {number} duration - 显示持续时间（毫秒），默认为 3000ms
 */
function showToast(message, duration = 3000) {
    const existingToast = document.querySelector('.toast');

    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// 为保存按钮添加快捷键支持
// 已合并到统一的键盘事件处理器中（见代码末尾）



// 一言功能
const quotes = [
    { text: "生活不是等待风暴过去，而是学会在雨中翩翩起舞。", author: "维维安·格林" },
    { text: "每一个不曾起舞的日子，都是对生命的辜负。", author: "尼采" },
    { text: "人生如逆旅，我亦是行人。", author: "苏轼" },
    { text: "生活不是别处，当下即是全部。", author: "加缪" },
    { text: "我们终此一生，就是要摆脱他人的期待，找到真正的自己。", author: "伍绮诗" },
    { text: "人生没有白走的路，每一步都算数。", author: "李宗盛" },
    { text: "生活不止眼前的苟且，还有诗和远方的田野。", author: "高晓松" },
    { text: "世界上只有一种英雄主义，就是认清生活的真相后依然热爱生活。", author: "罗曼·罗兰" },
    { text: "不要温和地走进那个良夜。", author: "狄兰·托马斯" },
    { text: "生命不是安排，而是追求。", author: "沈从文" },
    { text: "你若盛开，清风自来。", author: "三毛" },
    { text: "人生如茶，空杯以对，才有喝不完的好茶，才有装不完的欢喜和感动。", author: "丰子恺" },
    { text: "既然选择了远方，便只顾风雨兼程。", author: "汪国真" },
    { text: "人生最遗憾的，莫过于轻易放弃了不该放弃的。", author: "柏拉图" },
    { text: "当你为错过太阳而哭泣的时候，你也要再错过群星了。", author: "泰戈尔" },
    { text: "人生就像一盒巧克力，你永远不知道下一颗是什么味道。", author: "阿甘正传" },
    { text: "未经审视的人生不值得度过。", author: "苏格拉底" },
    { text: "生活就像一面镜子，你对它笑，它就对你笑。", author: "萨克雷" },
    { text: "生命诚可贵，爱情价更高。若为自由故，二者皆可抛。", author: "裴多菲" },
    { text: "时间会刺破青春表面的彩饰，会在美人的额上掘深沟浅槽。", author: "莎士比亚" }
];

const quoteText = document.getElementById('quote-text');
const quoteAuthor = document.getElementById('quote-author');
const refreshQuoteBtn = document.getElementById('refresh-quote');
const copyQuoteBtn = document.getElementById('copy-quote');

let savedFileCount = parseInt(localStorage.getItem('savedFileCount')) || 0;

/**
 * 显示随机名言
 * 
 * 从名言数组中随机选择一条名言并显示，带有淡入淡出动画效果。
 */
function displayRandomQuote() {
    quoteText.classList.add('loading');
    
    setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const quote = quotes[randomIndex];
        
        quoteText.style.opacity = '0';
        quoteAuthor.style.opacity = '0';
        
        setTimeout(() => {
            quoteText.textContent = quote.text;
            quoteAuthor.textContent = quote.author;
            quoteText.classList.remove('loading');
            quoteText.style.opacity = '1';
            quoteAuthor.style.opacity = '1';
        }, 300);
    }, 300);
}

refreshQuoteBtn.addEventListener('click', function() {
    displayRandomQuote();
    showToast('已获取新一言');
});

copyQuoteBtn.addEventListener('click', function() {
    const text = `${quoteText.textContent} —— ${quoteAuthor.textContent}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板');
    }).catch(() => {
        showToast('复制失败');
    });
});

// ========================================
// 设置面板功能
// ========================================
const themeOptions = document.querySelectorAll('.theme-option');
const settingsDarkMode = document.getElementById('settings-dark-mode');
const statTodos = document.getElementById('stat-todos');
const statNotes = document.getElementById('stat-notes');
const statSaved = document.getElementById('stat-saved');

// 加载保存的主题色
const savedThemeColor = localStorage.getItem('themeColor');
if (savedThemeColor) {
    document.body.classList.remove('theme-lotus', 'theme-sunrise', 'theme-sunset', 'theme-garden');
    document.body.classList.add(`theme-${savedThemeColor}`);
    
    themeOptions.forEach(option => {
        option.classList.remove('active');
        if (option.dataset.theme === savedThemeColor) {
            option.classList.add('active');
        }
    });
}

// 更新设置面板的深色模式开关状态
if (document.body.classList.contains('dark-mode')) {
    settingsDarkMode.classList.add('active');
}

// 主题色切换
themeOptions.forEach(option => {
    option.addEventListener('click', function() {
        const theme = this.dataset.theme;
        
        // 移除所有主题类
        document.body.classList.remove('theme-lotus', 'theme-sunrise', 'theme-sunset', 'theme-garden');
        
        // 添加选中的主题
        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }
        
        // 更新活动状态
        themeOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        // 保存主题设置
        localStorage.setItem('themeColor', theme);
        
        showToast('主题色已切换');
    });
});

// 设置面板的深色模式切换
settingsDarkMode.addEventListener('click', function() {
    themeToggle.click();
    this.classList.toggle('active');
});

// 更新统计数据
/**
 * 更新统计数据
 * 
 * 更新设置面板中的统计信息，包括：
 * - 待完成待办事项数量
 * - 便签数量
 * - 已保存文件数量
 */
function updateStats() {
    statTodos.textContent = todos.filter(t => !t.completed).length;
    statNotes.textContent = notes.length;
    statSaved.textContent = savedFileCount;
}

// ========================================
// 清除所有数据功能
// ========================================
const clearAllDataBtn = document.getElementById('clear-all-data-btn');

clearAllDataBtn.addEventListener('click', function() {
    if (confirm('确定要清除所有数据吗？此操作将删除：\n\n• 编辑器内容\n• 待办事项\n• 便签\n• 主题设置\n• 面板宽度\n• 保存进度\n• 所有其他本地数据\n\n此操作不可撤销！')) {
        // 清除所有 localStorage 数据
        localStorage.clear();
        
        // 清空数据数组
        todos = [];
        notes = [];
        savedFileCount = 0;
        
        // 清空编辑器
        editor.value = '';
        preview.innerHTML = '';
        
        // 重置主题
        document.body.classList.remove('dark-mode', 'theme-lotus', 'theme-sunrise', 'theme-sunset', 'theme-garden');
        themeIcon.textContent = '🌙';
        
        // 重置面板宽度
        leftPanel.style.flexBasis = '300px';
        centerPanel.style.flexBasis = '500px';
        
        // 重新渲染
        renderTodos();
        renderNotes();
        updateStats();
        updateWordCount();
        
        showToast('所有数据已清除');
    }
});



// Tooltip智能定位功能
document.addEventListener('DOMContentLoaded', function() {
    const tooltips = document.querySelectorAll('.tooltip');
    
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('mouseenter', function() {
            const tooltipEl = this;
            
            // 获取tooltip内容并计算高度
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
                position: fixed;
                visibility: hidden;
                padding: 8px 12px;
                font-size: 12px;
                line-height: 1.4;
                white-space: pre-wrap;
                max-width: 180px;
                word-break: break-word;
                text-align: center;
            `;
            tempDiv.textContent = tooltipEl.getAttribute('data-tooltip');
            document.body.appendChild(tempDiv);
            const tooltipHeight = tempDiv.offsetHeight;
            document.body.removeChild(tempDiv);
            
            // 检查是否会超出屏幕顶部
            const tooltipRect = tooltipEl.getBoundingClientRect();
            const spaceAbove = tooltipRect.top;
            const spaceBelow = window.innerHeight - tooltipRect.bottom;
            
            if (spaceAbove < tooltipHeight + 20 && spaceBelow > tooltipHeight + 20) {
                // 上方空间不足，显示在下方
                tooltipEl.setAttribute('data-tooltip-position', 'bottom');
            } else {
                tooltipEl.removeAttribute('data-tooltip-position');
            }
        });
    });
});// 单位转换器功能
const converterTabs = document.querySelectorAll('.converter-tab');
const converterInput = document.getElementById('converter-input');
const converterOutput = document.getElementById('converter-output');
const converterFrom = document.getElementById('converter-from');
const converterTo = document.getElementById('converter-to');

const conversionRates = {
    length: {
        m: 1,
        km: 0.001,
        cm: 100,
        mm: 1000,
        ft: 3.28084,
        in: 39.3701
    },
    weight: {
        kg: 1,
        g: 1000,
        mg: 1000000,
        lb: 2.20462,
        oz: 35.27396
    },
    temperature: {
        celsius: 'c',
        fahrenheit: 'f',
        kelvin: 'k'
    }
};

let currentConverterType = 'length';

converterTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        converterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        currentConverterType = this.dataset.type;
        updateConverterOptions();
    });
});

/**
 * 更新单位转换器的下拉选项
 * 
 * 根据当前选择的转换类型（长度、重量、温度）更新单位选择器的内容。
 */
function updateConverterOptions() {
    if (currentConverterType === 'length') {
        converterFrom.innerHTML = '<option value="m">米</option><option value="km">千米</option><option value="cm">厘米</option><option value="mm">毫米</option><option value="ft">英尺</option><option value="in">英寸</option>';
        converterTo.innerHTML = '<option value="m">米</option><option value="km">千米</option><option value="cm">厘米</option><option value="mm">毫米</option><option value="ft">英尺</option><option value="in">英寸</option>';
    } else if (currentConverterType === 'weight') {
        converterFrom.innerHTML = '<option value="kg">千克</option><option value="g">克</option><option value="mg">毫克</option><option value="lb">磅</option><option value="oz">盎司</option>';
        converterTo.innerHTML = '<option value="kg">千克</option><option value="g">克</option><option value="mg">毫克</option><option value="lb">磅</option><option value="oz">盎司</option>';
    } else if (currentConverterType === 'temperature') {
        converterFrom.innerHTML = '<option value="celsius">摄氏度</option><option value="fahrenheit">华氏度</option><option value="kelvin">开尔文</option>';
        converterTo.innerHTML = '<option value="celsius">摄氏度</option><option value="fahrenheit">华氏度</option><option value="kelvin">开尔文</option>';
    }
}

/**
 * 温度单位转换
 * 
 * @param {number} value - 要转换的温度值
 * @param {string} from - 源单位 ('celsius' | 'fahrenheit' | 'kelvin')
 * @param {string} to - 目标单位 ('celsius' | 'fahrenheit' | 'kelvin')
 * @returns {number} 转换后的温度值
 */
function convertTemperature(value, from, to) {
    if (from === to) return value;
    let celsius;
    if (from === 'celsius') celsius = value;
    else if (from === 'fahrenheit') celsius = (value - 32) * 5 / 9;
    else if (from === 'kelvin') celsius = value - 273.15;
    
    if (to === 'celsius') return celsius;
    else if (to === 'fahrenheit') return celsius * 9 / 5 + 32;
    else if (to === 'kelvin') return celsius + 273.15;
}

/**
 * 执行单位转换
 * 
 * 根据当前选择的转换类型和单位，计算转换结果并显示。
 */
function convert() {
    const value = parseFloat(converterInput.value);
    if (isNaN(value)) {
        converterOutput.value = '';
        return;
    }
    
    const from = converterFrom.value;
    const to = converterTo.value;
    
    if (currentConverterType === 'temperature') {
        converterOutput.value = convertTemperature(value, from, to).toFixed(2);
    } else {
        const rates = conversionRates[currentConverterType];
        const baseValue = value / rates[from];
        const result = baseValue * rates[to];
        converterOutput.value = result.toFixed(4);
    }
}

if (converterInput) {
    converterInput.addEventListener('input', convert);
    converterFrom.addEventListener('change', convert);
    converterTo.addEventListener('change', convert);
}

// 密码生成器功能
// 密码生成器功能
const passwordOutput = document.getElementById('password-output');
const passwordLength = document.getElementById('password-length');
const passwordLengthValue = document.getElementById('password-length-value');
const passwordUppercase = document.getElementById('password-uppercase');
const passwordLowercase = document.getElementById('password-lowercase');
const passwordNumbers = document.getElementById('password-numbers');
const passwordSymbols = document.getElementById('password-symbols');
const generatePasswordBtn = document.getElementById('generate-password');
const copyPasswordBtn = document.getElementById('copy-password');

if (passwordLength) {
    passwordLength.addEventListener('input', function() {
        passwordLengthValue.textContent = this.value;
    });

    function generatePassword() {
        const length = parseInt(passwordLength.value);
        const uppercase = passwordUppercase.checked;
        const lowercase = passwordLowercase.checked;
        const numbers = passwordNumbers.checked;
        const symbols = passwordSymbols.checked;
        
        let chars = '';
        if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) chars += '0123456789';
        if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        if (chars === '') {
            passwordOutput.value = '请至少选择一种字符类型';
            return;
        }
        
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        passwordOutput.value = password;
    }

    if (generatePasswordBtn) generatePasswordBtn.addEventListener('click', generatePassword);
    
    if (copyPasswordBtn) {
        copyPasswordBtn.addEventListener('click', function() {
            if (passwordOutput.value && passwordOutput.value !== '������ѡ��һ���ַ�����') {
                navigator.clipboard.writeText(passwordOutput.value);
                this.textContent = '�Ѹ���';
                setTimeout(() => { this.textContent = '����'; }, 2000);
            }
        });
    }
}

// �ı��������߹���
const textAnalyzerInput = document.getElementById('text-analyzer-input');
const statChars = document.getElementById('stat-chars');
const statWords = document.getElementById('stat-words');
const statLines = document.getElementById('stat-lines');
const statParagraphs = document.getElementById('stat-paragraphs');
const clearTextAnalyzerBtn = document.getElementById('clear-text-analyzer');
const copyTextStatsBtn = document.getElementById('copy-text-stats');

if (textAnalyzerInput) {
    function analyzeText() {
        const text = textAnalyzerInput.value;
        statChars.textContent = text.length;
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        statWords.textContent = text.trim() === '' ? 0 : words.length;
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        statLines.textContent = text.trim() === '' ? 0 : lines.length;
        const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0);
        statParagraphs.textContent = text.trim() === '' ? 0 : paragraphs.length;
    }

    textAnalyzerInput.addEventListener('input', analyzeText);
    
    if (clearTextAnalyzerBtn) {
        clearTextAnalyzerBtn.addEventListener('click', function() {
            textAnalyzerInput.value = '';
            analyzeText();
        });
    }
    
    if (copyTextStatsBtn) {
        copyTextStatsBtn.addEventListener('click', function() {
            const stats = '�ַ���: ' + statChars.textContent + '\n������: ' + statWords.textContent + '\n����: ' + statLines.textContent + '\n������: ' + statParagraphs.textContent;
            navigator.clipboard.writeText(stats);
            this.textContent = '�Ѹ���';
            setTimeout(() => { this.textContent = '����ͳ��'; }, 2000);
        });
    }
}

// ʱ���ת��������
// 时间戳转换功能
const timestampInput = document.getElementById('timestamp-input');
const timestampResult = document.getElementById('timestamp-result');
const dateInput = document.getElementById('date-input');
const dateResult = document.getElementById('date-result');
const convertTimestampBtn = document.getElementById('convert-timestamp');
const convertDateBtn = document.getElementById('convert-date');
const currentTimestampBtn = document.getElementById('current-timestamp');
const currentTimestampResult = document.getElementById('current-timestamp-result');

if (convertTimestampBtn) {
    convertTimestampBtn.addEventListener('click', function() {
        const timestamp = parseInt(timestampInput.value);
        if (isNaN(timestamp)) {
            timestampResult.textContent = '��������Ч��ʱ���';
            return;
        }
        
        const isSeconds = timestamp < 10000000000;
        const date = new Date(isSeconds ? timestamp * 1000 : timestamp);
        
        if (isNaN(date.getTime())) {
            timestampResult.textContent = '��Ч��ʱ���';
            return;
        }
        
        timestampResult.textContent = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    });
}

if (convertDateBtn) {
    convertDateBtn.addEventListener('click', function() {
        const dateValue = dateInput.value;
        if (!dateValue) {
            dateResult.textContent = '��ѡ������';
            return;
        }
        
        const date = new Date(dateValue);
        const timestamp = Math.floor(date.getTime() / 1000);
        dateResult.textContent = timestamp + ' ��';
    });
}

if (currentTimestampBtn) {
    currentTimestampBtn.addEventListener('click', function() {
        const now = Date.now();
        currentTimestampResult.textContent = now + ' ����';
        if (timestampInput) timestampInput.value = now;
        if (timestampResult) timestampResult.textContent = new Date(now).toLocaleString('zh-CN');
    });
}

// ========================================
// 统一的键盘事件处理器
// ========================================
// 优化：将所有键盘事件合并为一个监听器，提高性能
document.addEventListener('keydown', function(e) {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
    
    // Ctrl+F: 搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (activeElement === editor) {
            toggleSearchBar();
        }
        return;
    }
    
    // ESC键：退出全屏或关闭搜索栏
    if (e.key === 'Escape') {
        if (container && container.classList.contains('fullscreen')) {
            container.classList.remove('fullscreen');
            if (fullscreenBtn) {
                fullscreenBtn.classList.remove('active');
            }
            showToast('已退出全屏');
        } else if (searchBar && searchBar.style.display !== 'none') {
            toggleSearchBar();
        } else if (!isInputFocused) {
            // ESC清空计算器
            handleAction('clear');
        }
        return;
    }
    
    // F11: 全屏切换
    if (e.key === 'F11') {
        e.preventDefault();
        if (fullscreenBtn) {
            fullscreenBtn.click();
        }
        return;
    }
    
    // Ctrl+S: 保存文件
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
            document.getElementById('save-md-btn').click();
            showToast('已保存为Markdown文件');
        } else {
            document.getElementById('save-html-btn').click();
            showToast('已保存为HTML文件');
        }
        return;
    }
    
    // Ctrl+Shift+P: 保存进度
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        if (saveProgressBtn) {
            saveProgressBtn.click();
        }
        return;
    }
    
    // Ctrl+Shift+L: 恢复进度
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (loadProgressBtn) {
            loadProgressBtn.click();
        }
        return;
    }
    
    // 如果在输入框中，不处理其他快捷键
    if (isInputFocused) return;
    
    // 计算器键盘支持
    if (e.key >= '0' && e.key <= '9') {
        handleNumber(e.key);
        return;
    } else if (e.key === '+') {
        handleAction('add');
        return;
    } else if (e.key === '-') {
        handleAction('subtract');
        return;
    } else if (e.key === '*') {
        handleAction('multiply');
        return;
    } else if (e.key === '/') {
        handleAction('divide');
        return;
    } else if (e.key === '.') {
        handleAction('decimal');
        return;
    } else if (e.key === 'Enter' || e.key === '=') {
        handleAction('equals');
        return;
    } else if (e.key === 'Backspace') {
        handleAction('backspace');
        return;
    }
    
    // 工具切换快捷键
    const keyMap = {
        '1': 'calculator',
        '2': 'canvas',
        '3': 'clock',
        '4': 'todo',
        '5': 'notes',
        '6': 'color',
        '7': 'quote',
        '8': 'converter',
        '9': 'password',
        '0': 'text-analyzer',
        'q': 'timestamp',
        'Q': 'timestamp'
    };
    
    if (keyMap[e.key]) {
        e.preventDefault();
        const toolBtn = document.querySelector(`[data-tool="${keyMap[e.key]}"]`);
        if (toolBtn) {
            toolBtn.click();
        }
        return;
    }
    
    // ? 或 Ctrl+/: 显示快捷键面板
    if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        e.stopPropagation();
        const shortcutsPanel = document.getElementById('shortcuts-panel');
        const shortcutsBtn = document.getElementById('shortcuts-btn');
        if (shortcutsBtn) {
            shortcutsBtn.click();
        } else if (shortcutsPanel) {
            shortcutsPanel.classList.toggle('show');
        }
        return;
    }
});

// 快捷键面板功能 - 需要在DOMContentLoaded中绑定
document.addEventListener('DOMContentLoaded', function() {
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const shortcutsPanel = document.getElementById('shortcuts-panel');
    const shortcutsClose = document.getElementById('shortcuts-close');

    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (shortcutsPanel) {
                shortcutsPanel.classList.toggle('show');
            }
        });
    }

    if (shortcutsClose) {
        shortcutsClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (shortcutsPanel) {
                shortcutsPanel.classList.remove('show');
            }
        });
    }

    // 点击快捷键面板外部关闭
    document.addEventListener('click', function(e) {
        if (shortcutsPanel && shortcutsPanel.classList.contains('show')) {
            if (!shortcutsPanel.contains(e.target) && e.target !== shortcutsBtn) {
                shortcutsPanel.classList.remove('show');
            }
        }
    });
});

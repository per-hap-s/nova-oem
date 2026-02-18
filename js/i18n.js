/**
 * 国际化(i18n)核心模块 - 预加载增强版
 * 提供多语言翻译功能
 * 
 * 特性：
 * - 预加载模式：页面初始化时一次性加载所有语言包
 * - 即时切换：用户切换语言时无延迟，实现"秒切"效果
 * - 容错处理：单个语言包加载失败不影响整体功能
 * - IP地理位置检测：根据用户IP自动选择默认语言
 */
(function() {
    'use strict';

    var CONFIG = {
        defaultLang: 'en', // 默认语言改为英语
        supportedLangs: ['zh', 'zh-tw', 'th', 'en', 'ja', 'ko'],
        storageKey: 'nova_lang',
        debug: false, // 生产环境关闭调试模式
        enableGeoDetection: true // 是否启用IP地理位置检测
    };

    var currentLang = CONFIG.defaultLang;
    var translations = {};
    var isInitialized = false;

    /**
     * 安全地从localStorage获取数据
     * @param {string} key - 存储键名
     * @returns {string|null} 存储的值或null
     */
    function safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            // 隐私模式或localStorage不可用
            return null;
        }
    }

    /**
     * 安全地设置localStorage数据
     * @param {string} key - 存储键名
     * @param {string} value - 存储值
     */
    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            // 隐私模式或localStorage不可用，静默失败
        }
    }

    function log(message) {
        if (CONFIG.debug && console && console.log) {
            console.log('[i18n] ' + message);
        }
    }

    function logError(message, error) {
        if (CONFIG.debug && console && console.error) {
            console.error('[i18n] ' + message, error);
        }
    }

    function loadTranslations(lang) {
        log('Loading translations for: ' + lang);
        
        return fetch('locales/' + lang + '.json')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to load ' + lang + ' translations: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                translations[lang] = data;
                log('Successfully loaded translations for: ' + lang);
                return data;
            })
            .catch(function(error) {
                logError('Error loading ' + lang + ' translations:', error);
                return null;
            });
    }

    function t(key, lang) {
        var targetLang = lang || currentLang;
        var keys = key.split('.');
        var value = translations[targetLang];
        
        if (!value) {
            log('No translations loaded for: ' + targetLang);
            return key;
        }
        
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key;
            }
        }
        
        return typeof value === 'string' ? value : key;
    }

    function updatePageTranslations() {
        log('Updating page translations for: ' + currentLang);
        
        var elements = document.querySelectorAll('[data-i18n]');
        log('Found ' + elements.length + ' elements to translate');
        
        elements.forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            var translation = t(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });

        // 更新title
        var titleEl = document.querySelector('title');
        if (titleEl) {
            titleEl.textContent = t('common.title');
        }

        // 更新meta标签
        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', t('common.description'));
        }

        var metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
            metaKeywords.setAttribute('content', t('common.keywords'));
        }

        var ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', t('common.ogTitle'));
        }

        var ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) {
            ogDesc.setAttribute('content', t('common.ogDescription'));
        }

        // 更新当前语言显示 - 关键修复
        updateCurrentLangDisplay();

        // 更新HTML lang属性
        var htmlEl = document.documentElement;
        if (htmlEl) {
            htmlEl.setAttribute('lang', currentLang);
        }
        
        // 更新地图标签
        if (typeof window.updateMapPopup === 'function') {
            window.updateMapPopup();
        }
        
        log('Page translations updated');
    }

    function updateCurrentLangDisplay() {
        var currentLangEl = document.getElementById('currentLang');
        if (currentLangEl) {
            var langName = t('lang.' + currentLang);
            log('Updating currentLang display to: ' + langName);
            currentLangEl.textContent = langName;
        } else {
            logError('currentLang element not found');
        }
    }

    /**
     * 设置当前语言
     * 由于采用预加载模式，所有语言包已在初始化时加载
     * 切换语言时直接应用翻译，实现无延迟的即时切换效果
     */
    function setLanguage(lang) {
        log('Setting language to: ' + lang);
        
        if (CONFIG.supportedLangs.indexOf(lang) === -1) {
            logError('Unsupported language: ' + lang);
            return Promise.reject(new Error('Unsupported language'));
        }

        // 检查语言包是否已预加载
        if (!translations[lang]) {
            logError('Language pack not preloaded: ' + lang);
            return Promise.reject(new Error('Language pack not preloaded'));
        }

        // 所有语言包已预加载，直接切换，实现即时切换效果
        currentLang = lang;
        safeSetItem(CONFIG.storageKey, lang);
        updatePageTranslations();
        log('Language switched to: ' + lang + ' (instant switch)');
        return Promise.resolve();
    }

    function getLanguage() {
        return currentLang;
    }

    /**
     * 初始化i18n模块
     * 采用预加载模式：页面初始化时一次性加载所有语言包
     * 确保用户切换语言时能够实现无延迟的即时切换效果
     * 
     * 语言选择优先级：
     * 1. 用户已保存的语言偏好
     * 2. 浏览器语言偏好
     * 3. IP地理位置检测结果
     * 4. 默认语言（英语）
     */
    function init() {
        if (isInitialized) {
            log('i18n already initialized');
            return Promise.resolve();
        }
        
        log('Initializing i18n module');
        
        var savedLang = safeGetItem(CONFIG.storageKey);
        
        log('Preloading all language packs: ' + CONFIG.supportedLangs.join(', '));

        // 预加载所有支持的语言包，单个失败不影响整体功能
        var promises = CONFIG.supportedLangs.map(function(lang) {
            return loadTranslations(lang).catch(function(error) {
                logError('Failed to preload language: ' + lang, error);
                return null; // 单个失败不中断整体加载
            });
        });

        return Promise.all(promises)
            .then(function(results) {
                // 统计成功加载的语言包数量
                var loadedCount = results.filter(function(r) { return r !== null; }).length;
                log('Successfully preloaded ' + loadedCount + '/' + CONFIG.supportedLangs.length + ' language packs');
                
                // 确定初始语言
                return determineInitialLanguage(savedLang);
            })
            .then(function(initialLang) {
                currentLang = initialLang;
                isInitialized = true;
                updatePageTranslations();
                bindLanguageSwitchEvents();
                bindDropdownEvents();
                log('i18n initialization complete, initial language: ' + initialLang);
            })
            .catch(function(error) {
                logError('Error initializing i18n:', error);
                // 出错时使用默认语言
                currentLang = CONFIG.defaultLang;
                isInitialized = true;
                updatePageTranslations();
                bindLanguageSwitchEvents();
                bindDropdownEvents();
            });
    }

    /**
     * 确定初始语言
     * 优先级：已保存偏好 > 浏览器偏好 > IP地理位置 > 默认语言
     * @param {string} savedLang - 用户已保存的语言偏好
     * @returns {Promise<string>} 初始语言代码
     */
    function determineInitialLanguage(savedLang) {
        // 辅助函数：检查语言是否支持
        function isSupported(lang) {
            return CONFIG.supportedLangs.indexOf(lang) !== -1;
        }

        // 如果用户已有语言偏好，直接使用
        if (savedLang && isSupported(savedLang)) {
            log('Using saved language preference: ' + savedLang);
            return Promise.resolve(savedLang);
        }

        // 优先级2：浏览器语言偏好
        var browserLang = getBrowserLanguageFallback();
        if (browserLang && isSupported(browserLang)) {
            log('Using browser language preference: ' + browserLang);
            return Promise.resolve(browserLang);
        }

        // 浏览器语言不支持时，继续尝试IP地理位置检测
        log('Browser language not supported, trying IP geo detection...');

        // 优先级3：IP地理位置检测
        if (CONFIG.enableGeoDetection && window.GeoLanguage) {
            log('Detecting language by IP geo location...');
            return window.GeoLanguage.detectLanguage(null, CONFIG.supportedLangs)
                .then(function(lang) {
                    log('Detected language by IP: ' + lang);
                    return lang;
                })
                .catch(function(error) {
                    logError('Language detection failed:', error);
                    // IP检测失败时，使用默认语言
                    return CONFIG.defaultLang;
                });
        }

        // 优先级4：降级到默认语言
        log('Using default language: ' + CONFIG.defaultLang);
        return Promise.resolve(CONFIG.defaultLang);
    }

    /**
     * 获取浏览器语言偏好（降级方案）
     * @returns {string|null} 语言代码，如果不支持则返回null
     */
    function getBrowserLanguageFallback() {
        var browserLang = navigator.language || navigator.userLanguage || '';
        var langLower = browserLang.toLowerCase();
        
        log('Browser language fallback: ' + browserLang);

        var langMap = {
            'zh-cn': 'zh',
            'zh-tw': 'zh-tw',
            'zh-hk': 'zh-tw',
            'zh-mo': 'zh-tw',
            'zh': 'zh',
            'en-us': 'en',
            'en-gb': 'en',
            'en': 'en',
            'ja': 'ja',
            'ko': 'ko',
            'th': 'th'
        };

        // 先尝试完整匹配
        if (langMap[langLower] && CONFIG.supportedLangs.indexOf(langMap[langLower]) !== -1) {
            return langMap[langLower];
        }

        // 再尝试前缀匹配
        var prefix = langLower.split('-')[0];
        if (langMap[prefix] && CONFIG.supportedLangs.indexOf(langMap[prefix]) !== -1) {
            return langMap[prefix];
        }

        // 浏览器语言不支持，返回null，由调用方决定后续处理
        log('Browser language not supported: ' + browserLang);
        return null;
    }

    function bindLanguageSwitchEvents() {
        log('Binding language switch events');
        var langButtons = document.querySelectorAll('.lang-option');
        log('Found ' + langButtons.length + ' language buttons');
        
        langButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var lang = btn.getAttribute('data-lang');
                log('Language button clicked: ' + lang);
                
                if (lang) {
                    setLanguage(lang).then(function() {
                        closeLangDropdown();
                    });
                }
            });
        });
    }

    function bindDropdownEvents() {
        var langDropdownBtn = document.getElementById('langDropdownBtn');
        var langDropdown = document.getElementById('langDropdown');
        
        if (langDropdownBtn && langDropdown) {
            // 切换下拉菜单显示/隐藏
            langDropdownBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleLangDropdown();
            });
            
            // 点击外部关闭下拉菜单
            document.addEventListener('click', function(e) {
                if (!langDropdownBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                    closeLangDropdown();
                }
            });
        }
    }

    function toggleLangDropdown() {
        var langDropdown = document.getElementById('langDropdown');
        var langDropdownBtn = document.getElementById('langDropdownBtn');
        var langDropdownIcon = document.getElementById('langDropdownIcon');
        
        if (!langDropdown || !langDropdownBtn || !langDropdownIcon) {
            return;
        }
        
        var isOpen = langDropdown.classList.contains('visible');
        
        if (isOpen) {
            closeLangDropdown();
        } else {
            langDropdown.classList.remove('invisible', 'opacity-0', '-translate-y-2');
            langDropdown.classList.add('visible', 'opacity-100', 'translate-y-0');
            langDropdownBtn.setAttribute('aria-expanded', 'true');
            langDropdownIcon.classList.add('rotate-180');
        }
    }

    function closeLangDropdown() {
        var langDropdown = document.getElementById('langDropdown');
        var langDropdownBtn = document.getElementById('langDropdownBtn');
        var langDropdownIcon = document.getElementById('langDropdownIcon');
        
        if (langDropdown && langDropdownBtn && langDropdownIcon) {
            langDropdown.classList.add('invisible', 'opacity-0', '-translate-y-2');
            langDropdown.classList.remove('visible', 'opacity-100', 'translate-y-0');
            langDropdownBtn.setAttribute('aria-expanded', 'false');
            langDropdownIcon.classList.remove('rotate-180');
        }
    }

    // 暴露公共API
    window.I18n = {
        init: init,
        t: t,
        setLanguage: setLanguage,
        getLanguage: getLanguage,
        loadTranslations: loadTranslations,
        updatePageTranslations: updatePageTranslations,
        closeLangDropdown: closeLangDropdown,
        toggleLangDropdown: toggleLangDropdown
    };

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

/**
 * 国际化(i18n)核心模块 - 增强版
 * 提供多语言翻译功能
 */
(function() {
    'use strict';

    var CONFIG = {
        defaultLang: 'zh',
        supportedLangs: ['zh', 'zh-tw', 'th', 'en', 'ja', 'ko'],
        storageKey: 'nova_lang',
        debug: true
    };

    var currentLang = CONFIG.defaultLang;
    var translations = {};
    var isInitialized = false;

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

    function setLanguage(lang) {
        log('Setting language to: ' + lang);
        
        if (CONFIG.supportedLangs.indexOf(lang) === -1) {
            logError('Unsupported language: ' + lang);
            return Promise.reject(new Error('Unsupported language'));
        }

        // 显示加载状态
        showLoadingState();

        if (!translations[lang]) {
            return loadTranslations(lang).then(function() {
                currentLang = lang;
                localStorage.setItem(CONFIG.storageKey, lang);
                updatePageTranslations();
                hideLoadingState();
                log('Language switched to: ' + lang);
            }).catch(function(error) {
                hideLoadingState();
                logError('Failed to switch language:', error);
            });
        } else {
            currentLang = lang;
            localStorage.setItem(CONFIG.storageKey, lang);
            updatePageTranslations();
            hideLoadingState();
            log('Language switched to: ' + lang);
            return Promise.resolve();
        }
    }

    function showLoadingState() {
        var currentLangEl = document.getElementById('currentLang');
        if (currentLangEl) {
            currentLangEl.style.opacity = '0.5';
        }
    }

    function hideLoadingState() {
        var currentLangEl = document.getElementById('currentLang');
        if (currentLangEl) {
            currentLangEl.style.opacity = '1';
        }
    }

    function getLanguage() {
        return currentLang;
    }

    function init() {
        if (isInitialized) {
            log('i18n already initialized');
            return Promise.resolve();
        }
        
        log('Initializing i18n module');
        
        var savedLang = localStorage.getItem(CONFIG.storageKey);
        var initialLang = savedLang && CONFIG.supportedLangs.indexOf(savedLang) !== -1 ? savedLang : CONFIG.defaultLang;
        
        log('Initial language: ' + initialLang);

        var promises = [loadTranslations(CONFIG.defaultLang)];
        if (initialLang !== CONFIG.defaultLang) {
            promises.push(loadTranslations(initialLang));
        }

        return Promise.all(promises).then(function() {
            currentLang = initialLang;
            isInitialized = true;
            updatePageTranslations();
            bindLanguageSwitchEvents();
            bindDropdownEvents();
            log('i18n initialization complete');
        }).catch(function(error) {
            logError('Error initializing i18n:', error);
        });
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

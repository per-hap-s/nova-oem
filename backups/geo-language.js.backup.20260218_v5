/**
 * IP地理位置语言检测模块
 * 根据用户IP地址自动选择默认展示语言
 * 
 * 特性：
 * - 支持多IP解析API（主备切换）
 * - 本地缓存减少API请求
 * - 降级策略：IP解析失败时使用浏览器语言偏好
 * - 隐私保护：不存储用户真实IP地址
 */
(function() {
    'use strict';

    /**
     * 配置项
     */
    var GEO_CONFIG = {
        // 是否启用IP地理位置检测
        enabled: true,
        // 缓存存储键名
        cacheKey: 'nova_geo_cache',
        // 缓存有效期（24小时，单位毫秒）
        cacheExpireTime: 24 * 60 * 60 * 1000,
        // API请求超时时间（毫秒）
        apiTimeout: 3000,
        // 调试模式（生产环境应设为false）
        debug: false,
        // 默认语言（英语）
        defaultLang: 'en',
        // 主IP解析API（ip-api.com，使用HTTPS协议）
        primaryAPI: 'https://ipapi.co/json/',
        // 备用IP解析API（ipwhois.app，免费无需注册）
        backupAPI: 'https://ipwhois.app/json/'
    };

    /**
     * 国家/地区到语言的映射表
     * 未在此表中列出的国家默认使用英语
     */
    var COUNTRY_LANG_MAP = {
        // 中国大陆 -> 简体中文
        'CN': 'zh',
        // 台湾、香港、澳门 -> 繁体中文
        'TW': 'zh-tw',
        'HK': 'zh-tw',
        'MO': 'zh-tw',
        // 泰国 -> 泰语
        'TH': 'th',
        // 日本 -> 日语
        'JP': 'ja',
        // 韩国、朝鲜 -> 韩语
        'KR': 'ko',
        'KP': 'ko'
        // 其他所有国家默认使用英语（defaultLang: 'en'）
    };

    /**
     * 日志输出函数
     * @param {string} message - 日志消息
     */
    function log(message) {
        if (GEO_CONFIG.debug && console && console.log) {
            console.log('[GeoLanguage] ' + message);
        }
    }

    /**
     * 错误日志输出函数
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
    function logError(message, error) {
        if (GEO_CONFIG.debug && console && console.error) {
            console.error('[GeoLanguage] ' + message, error);
        }
    }

    /**
     * 安全地从localStorage获取数据
     * @param {string} key - 存储键名
     * @returns {string|null} 存储的值或null
     */
    function safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
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
            // 静默失败
        }
    }

    /**
     * 安全地从localStorage删除数据
     * @param {string} key - 存储键名
     */
    function safeRemoveItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            // 静默失败
        }
    }

    /**
     * 获取缓存的地理位置信息
     * @returns {Object|null} 缓存的地理位置数据或null
     */
    function getCachedGeoLocation() {
        try {
            var cached = safeGetItem(GEO_CONFIG.cacheKey);
            if (cached) {
                var data = JSON.parse(cached);
                if (Date.now() - data.timestamp < GEO_CONFIG.cacheExpireTime) {
                    log('Using cached geo location: ' + data.country);
                    return data;
                } else {
                    log('Cache expired, will fetch new data');
                    safeRemoveItem(GEO_CONFIG.cacheKey);
                }
            }
        } catch (error) {
            logError('Error reading cache:', error);
        }
        return null;
    }

    /**
     * 缓存地理位置信息
     * @param {string} country - 国家代码
     */
    function setCachedGeoLocation(country) {
        try {
            var cacheData = {
                country: country,
                timestamp: Date.now()
            };
            safeSetItem(GEO_CONFIG.cacheKey, JSON.stringify(cacheData));
            log('Cached geo location: ' + country);
        } catch (error) {
            logError('Error setting cache:', error);
        }
    }

    /**
     * 带超时的fetch请求
     * @param {string} url - 请求URL
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise} fetch响应Promise
     */
    function fetchWithTimeout(url, timeout) {
        return new Promise(function(resolve, reject) {
            var timeoutId = setTimeout(function() {
                reject(new Error('Request timeout'));
            }, timeout);

            fetch(url)
                .then(function(response) {
                    clearTimeout(timeoutId);
                    resolve(response);
                })
                .catch(function(error) {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * 从主API获取地理位置信息
     * @returns {Promise<Object|null>} 地理位置数据或null
     */
    function fetchFromPrimaryAPI() {
        log('Fetching from primary API (ipapi.co)');
        return fetchWithTimeout(GEO_CONFIG.primaryAPI, GEO_CONFIG.apiTimeout)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Primary API response not ok: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                // ipapi.co 返回格式：{ country_code: "CN", country_name: "China", ... }
                if (data && data.country_code) {
                    log('Primary API success: ' + (data.country_name || data.country_code));
                    return {
                        country: data.country_code
                    };
                }
                throw new Error('Primary API returned no country_code');
            });
    }

    /**
     * 从备用API获取地理位置信息
     * @returns {Promise<Object|null>} 地理位置数据或null
     */
    function fetchFromBackupAPI() {
        log('Fetching from backup API (ipwhois.app)');
        return fetchWithTimeout(GEO_CONFIG.backupAPI, GEO_CONFIG.apiTimeout)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Backup API response not ok: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                // ipwhois.app 返回格式：{ country_code: "CN", country: "China", ... }
                if (data && data.country_code) {
                    log('Backup API success: ' + data.country + ' (' + data.country_code + ')');
                    return {
                        country: data.country_code
                    };
                }
                throw new Error('Backup API returned no country_code');
            });
    }

    /**
     * 获取IP地理位置信息
     * 依次尝试主API和备用API
     * @returns {Promise<Object|null>} 地理位置数据或null
     */
    function getIPGeoLocation() {
        if (!GEO_CONFIG.enabled) {
            log('Geo location detection disabled');
            return Promise.resolve(null);
        }

        // 检查缓存
        var cached = getCachedGeoLocation();
        if (cached) {
            return Promise.resolve(cached);
        }

        // 尝试主API
        return fetchFromPrimaryAPI()
            .catch(function(primaryError) {
                logError('Primary API failed:', primaryError);
                // 尝试备用API
                return fetchFromBackupAPI()
                    .catch(function(backupError) {
                        logError('Backup API failed:', backupError);
                        return null;
                    });
            })
            .then(function(result) {
                if (result && result.country) {
                    // 缓存结果（不包含IP地址，保护隐私）
                    setCachedGeoLocation(result.country);
                }
                return result;
            });
    }

    /**
     * 根据国家代码获取对应语言
     * @param {string} countryCode - 国家代码（如CN、US、JP等）
     * @returns {string} 语言代码
     */
    function getLanguageByCountry(countryCode) {
        if (countryCode && COUNTRY_LANG_MAP[countryCode]) {
            var lang = COUNTRY_LANG_MAP[countryCode];
            log('Country ' + countryCode + ' mapped to language: ' + lang);
            return lang;
        }
        log('Country ' + countryCode + ' not in map, using default: ' + GEO_CONFIG.defaultLang);
        return GEO_CONFIG.defaultLang;
    }

    /**
     * 获取浏览器语言偏好
     * @returns {string} 语言代码
     */
    function getBrowserLanguage() {
        var browserLang = navigator.language || navigator.userLanguage || '';
        var langLower = browserLang.toLowerCase();
        
        log('Browser language: ' + browserLang);

        // 语言映射表
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
        if (langMap[langLower]) {
            return langMap[langLower];
        }

        // 再尝试前缀匹配
        var prefix = langLower.split('-')[0];
        if (langMap[prefix]) {
            return langMap[prefix];
        }

        log('Browser language not recognized, using default: ' + GEO_CONFIG.defaultLang);
        return GEO_CONFIG.defaultLang;
    }

    /**
     * 检测用户应该使用的语言
     * 注意：此函数由i18n.js调用，浏览器语言偏好已在调用前检查
     * 此函数内部优先级：IP地理位置 > 浏览器偏好 > 默认语言
     * @param {string} savedLang - 用户已保存的语言偏好（通常为null，已在调用前处理）
     * @param {string[]} supportedLangs - 支持的语言列表
     * @returns {Promise<string>} 检测到的语言代码
     */
    function detectLanguage(savedLang, supportedLangs) {
        log('Starting language detection...');
        log('Supported languages: ' + supportedLangs.join(', '));

        // 辅助函数：检查语言是否支持
        function isSupported(lang) {
            return supportedLangs.indexOf(lang) !== -1;
        }

        // 优先级1：用户已保存的语言偏好
        if (savedLang && isSupported(savedLang)) {
            log('Using saved language preference: ' + savedLang);
            return Promise.resolve(savedLang);
        }

        // 优先级2：IP地理位置检测
        return getIPGeoLocation()
            .then(function(geo) {
                if (geo && geo.country) {
                    var lang = getLanguageByCountry(geo.country);
                    if (isSupported(lang)) {
                        log('Using IP-based language: ' + lang);
                        return lang;
                    }
                }
                return null;
            })
            .then(function(ipLang) {
                if (ipLang) {
                    return ipLang;
                }

                // 优先级3：浏览器语言偏好
                var browserLang = getBrowserLanguage();
                if (isSupported(browserLang)) {
                    log('Using browser language: ' + browserLang);
                    return browserLang;
                }

                // 优先级4：默认语言（英语）
                log('Using default language: ' + GEO_CONFIG.defaultLang);
                return GEO_CONFIG.defaultLang;
            })
            .catch(function(error) {
                logError('Language detection error:', error);
                // 出错时使用默认语言
                return GEO_CONFIG.defaultLang;
            });
    }

    /**
     * 清除地理位置缓存
     */
    function clearCache() {
        safeRemoveItem(GEO_CONFIG.cacheKey);
        log('Geo location cache cleared');
    }

    /**
     * 获取当前配置
     * @returns {Object} 配置对象
     */
    function getConfig() {
        return GEO_CONFIG;
    }

    // 暴露公共API
    window.GeoLanguage = {
        detectLanguage: detectLanguage,
        getIPGeoLocation: getIPGeoLocation,
        getLanguageByCountry: getLanguageByCountry,
        getBrowserLanguage: getBrowserLanguage,
        clearCache: clearCache,
        getConfig: getConfig,
        getCachedGeoLocation: getCachedGeoLocation
    };

    log('GeoLanguage module loaded');

})();

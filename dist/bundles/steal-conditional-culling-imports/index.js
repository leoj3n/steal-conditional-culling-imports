/*[system-bundles-config]*/
System.bundles = {"bundles/steal-conditional-culling-imports/lib/file-a":["steal-conditional-culling-imports@1.0.0#lib/file-a"],"bundles/steal-conditional-culling-imports/lib/file-b":["steal-conditional-culling-imports@1.0.0#lib/file-b"]};
/*npm-utils*/
define('npm-utils', function (require, exports, module) {
    (function (global, require, exports, module) {
        var slice = Array.prototype.slice;
        var npmModuleRegEx = /.+@.+\..+\..+#.+/;
        var conditionalModuleRegEx = /#\{[^\}]+\}|#\?.+$/;
        var gitUrlEx = /(git|http(s?)):\/\//;
        var supportsSet = typeof Set === 'function';
        var utils = {
            extend: function (d, s, deep, existingSet) {
                var val;
                var set = existingSet;
                if (deep) {
                    if (!set) {
                        if (supportsSet) {
                            set = new Set();
                        } else {
                            set = [];
                        }
                    }
                    if (supportsSet) {
                        if (set.has(s)) {
                            return s;
                        } else {
                            set.add(s);
                        }
                    } else {
                        if (set.indexOf(s) !== -1) {
                            return s;
                        } else {
                            set.push(s);
                        }
                    }
                }
                for (var prop in s) {
                    val = s[prop];
                    if (deep) {
                        if (utils.isArray(val)) {
                            d[prop] = slice.call(val);
                        } else if (utils.isPlainObject(val)) {
                            d[prop] = utils.extend({}, val, deep, set);
                        } else {
                            d[prop] = s[prop];
                        }
                    } else {
                        d[prop] = s[prop];
                    }
                }
                return d;
            },
            map: function (arr, fn) {
                var i = 0, len = arr.length, out = [];
                for (; i < len; i++) {
                    out.push(fn.call(arr, arr[i]));
                }
                return out;
            },
            filter: function (arr, fn) {
                var i = 0, len = arr.length, out = [], res;
                for (; i < len; i++) {
                    res = fn.call(arr, arr[i]);
                    if (res) {
                        out.push(arr[i]);
                    }
                }
                return out;
            },
            forEach: function (arr, fn) {
                var i = 0, len = arr.length;
                for (; i < len; i++) {
                    fn.call(arr, arr[i], i);
                }
            },
            flow: function (fns) {
                return function () {
                    var res = fns[0].apply(this, arguments);
                    for (var i = 1; i < fns.length; i++) {
                        res = fns[i].call(this, res);
                    }
                    return res;
                };
            },
            isObject: function (obj) {
                return typeof obj === 'object';
            },
            isPlainObject: function (obj) {
                return utils.isObject(obj) && (!obj || obj.__proto__ === Object.prototype);
            },
            isArray: Array.isArray || function (arr) {
                return Object.prototype.toString.call(arr) === '[object Array]';
            },
            isEnv: function (name) {
                return this.isEnv ? this.isEnv(name) : this.env === name;
            },
            isGitUrl: function (str) {
                return gitUrlEx.test(str);
            },
            warnOnce: function (msg) {
                var w = this._warnings = this._warnings || {};
                if (w[msg])
                    return;
                w[msg] = true;
                this.warn(msg);
            },
            warn: function (msg) {
                if (typeof steal !== 'undefined' && typeof console !== 'undefined' && console.warn) {
                    steal.done().then(function () {
                        if (steal.dev && steal.dev.warn) {
                        } else if (console.warn) {
                            console.warn('steal.js WARNING: ' + msg);
                        } else {
                            console.log(msg);
                        }
                    });
                }
            },
            relativeURI: function (baseURL, url) {
                return typeof steal !== 'undefined' ? steal.relativeURI(baseURL, url) : url;
            },
            moduleName: {
                create: function (descriptor, standard) {
                    if (standard) {
                        return descriptor.moduleName;
                    } else {
                        if (descriptor === '@empty') {
                            return descriptor;
                        }
                        var modulePath;
                        if (descriptor.modulePath) {
                            modulePath = descriptor.modulePath.substr(0, 2) === './' ? descriptor.modulePath.substr(2) : descriptor.modulePath;
                        }
                        var version = descriptor.version;
                        if (version && version[0] !== '^') {
                            version = encodeURIComponent(decodeURIComponent(version));
                        }
                        return descriptor.packageName + (version ? '@' + version : '') + (modulePath ? '#' + modulePath : '') + (descriptor.plugin ? descriptor.plugin : '');
                    }
                },
                isNpm: function (moduleName) {
                    return npmModuleRegEx.test(moduleName);
                },
                isConditional: function (moduleName) {
                    return conditionalModuleRegEx.test(moduleName);
                },
                isFullyConvertedNpm: function (parsedModuleName) {
                    return !!(parsedModuleName.packageName && parsedModuleName.version && parsedModuleName.modulePath);
                },
                isScoped: function (moduleName) {
                    return moduleName[0] === '@';
                },
                parse: function (moduleName, currentPackageName, global, context) {
                    var pluginParts = moduleName.split('!');
                    var modulePathParts = pluginParts[0].split('#');
                    var versionParts = modulePathParts[0].split('@');
                    if (!modulePathParts[1] && !versionParts[0]) {
                        versionParts = ['@' + versionParts[1]];
                    }
                    if (versionParts.length === 3 && utils.moduleName.isScoped(moduleName)) {
                        versionParts.splice(0, 1);
                        versionParts[0] = '@' + versionParts[0];
                    }
                    var packageName, modulePath;
                    if (currentPackageName && utils.path.isRelative(moduleName)) {
                        packageName = currentPackageName;
                        modulePath = versionParts[0];
                    } else if (currentPackageName && utils.path.isInHomeDir(moduleName, context)) {
                        packageName = currentPackageName;
                        modulePath = versionParts[0].split('/').slice(1).join('/');
                    } else {
                        if (modulePathParts[1]) {
                            packageName = versionParts[0];
                            modulePath = modulePathParts[1];
                        } else {
                            var folderParts = versionParts[0].split('/');
                            if (folderParts.length && folderParts[0][0] === '@') {
                                packageName = folderParts.splice(0, 2).join('/');
                            } else {
                                packageName = folderParts.shift();
                            }
                            modulePath = folderParts.join('/');
                        }
                    }
                    modulePath = utils.path.removeJS(modulePath);
                    return {
                        plugin: pluginParts.length === 2 ? '!' + pluginParts[1] : undefined,
                        version: versionParts[1],
                        modulePath: modulePath,
                        packageName: packageName,
                        moduleName: moduleName,
                        isGlobal: global
                    };
                },
                parseFromPackage: function (loader, refPkg, name, parentName) {
                    var packageName = utils.pkg.name(refPkg), parsedModuleName = utils.moduleName.parse(name, packageName, undefined, { loader: loader }), isRelative = utils.path.isRelative(parsedModuleName.modulePath);
                    if (isRelative && !parentName) {
                        throw new Error('Cannot resolve a relative module identifier ' + 'with no parent module:', name);
                    }
                    if (isRelative) {
                        var parentParsed = utils.moduleName.parse(parentName, packageName);
                        if (parentParsed.packageName === parsedModuleName.packageName && parentParsed.modulePath) {
                            var makePathRelative = true;
                            if (name === '../' || name === './' || name === '..') {
                                var relativePath = utils.path.relativeTo(parentParsed.modulePath, name);
                                var isInRoot = utils.path.isPackageRootDir(relativePath);
                                if (isInRoot) {
                                    parsedModuleName.modulePath = utils.pkg.main(refPkg);
                                    makePathRelative = false;
                                } else {
                                    parsedModuleName.modulePath = name + (utils.path.endsWithSlash(name) ? '' : '/') + 'index';
                                }
                            }
                            if (makePathRelative) {
                                parsedModuleName.modulePath = utils.path.makeRelative(utils.path.joinURIs(parentParsed.modulePath, parsedModuleName.modulePath));
                            }
                        }
                    }
                    var mapName = utils.moduleName.create(parsedModuleName), refSteal = utils.pkg.config(refPkg), mappedName;
                    if (refPkg.browser && typeof refPkg.browser !== 'string' && mapName in refPkg.browser && (!refSteal || !refSteal.ignoreBrowser)) {
                        mappedName = refPkg.browser[mapName] === false ? '@empty' : refPkg.browser[mapName];
                    }
                    var global = loader && loader.globalBrowser && loader.globalBrowser[mapName];
                    if (global) {
                        mappedName = global.moduleName === false ? '@empty' : global.moduleName;
                    }
                    if (mappedName) {
                        return utils.moduleName.parse(mappedName, packageName, !!global);
                    } else {
                        return parsedModuleName;
                    }
                },
                nameAndVersion: function (parsedModuleName) {
                    return parsedModuleName.packageName + '@' + parsedModuleName.version;
                },
                isBareIdentifier: function (identifier) {
                    return identifier && identifier[0] !== '.' && identifier[0] !== '@';
                }
            },
            pkg: {
                name: function (pkg) {
                    var steal = utils.pkg.config(pkg);
                    return steal && steal.name || pkg.name;
                },
                main: function (pkg) {
                    var main;
                    var steal = utils.pkg.config(pkg);
                    if (steal && steal.main) {
                        main = steal.main;
                    } else if (typeof pkg.browser === 'string') {
                        if (utils.path.endsWithSlash(pkg.browser)) {
                            main = pkg.browser + 'index';
                        } else {
                            main = pkg.browser;
                        }
                    } else if (typeof pkg.jam === 'object' && pkg.jam.main) {
                        main = pkg.jam.main;
                    } else if (pkg.main) {
                        main = pkg.main;
                    } else {
                        main = 'index';
                    }
                    return utils.path.removeJS(utils.path.removeDotSlash(main));
                },
                rootDir: function (pkg, isRoot) {
                    var root = isRoot ? utils.path.removePackage(pkg.fileUrl) : utils.path.pkgDir(pkg.fileUrl);
                    var lib = utils.pkg.directoriesLib(pkg);
                    if (lib) {
                        root = utils.path.joinURIs(utils.path.addEndingSlash(root), lib);
                    }
                    return root;
                },
                isRoot: function (loader, pkg) {
                    var root = utils.pkg.getDefault(loader);
                    return pkg && pkg.name === root.name && pkg.version === root.version;
                },
                homeAlias: function (context) {
                    return context && context.loader && context.loader.homeAlias || '~';
                },
                getDefault: function (loader) {
                    return loader.npmPaths.__default;
                },
                findByModuleNameOrAddress: function (loader, moduleName, moduleAddress) {
                    if (loader.npm) {
                        if (moduleName) {
                            var parsed = utils.moduleName.parse(moduleName);
                            if (parsed.version && parsed.packageName) {
                                var name = parsed.packageName + '@' + parsed.version;
                                if (name in loader.npm) {
                                    return loader.npm[name];
                                }
                            }
                        }
                        if (moduleAddress) {
                            var startingAddress = utils.relativeURI(loader.baseURL, moduleAddress);
                            var packageFolder = utils.pkg.folderAddress(startingAddress);
                            return packageFolder ? loader.npmPaths[packageFolder] : utils.pkg.getDefault(loader);
                        } else {
                            return utils.pkg.getDefault(loader);
                        }
                    }
                },
                folderAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), nextSlash = address.indexOf('/', nodeModulesIndex + nodeModules.length);
                    if (nodeModulesIndex >= 0) {
                        return nextSlash >= 0 ? address.substr(0, nextSlash) : address;
                    }
                },
                findDep: function (loader, refPkg, name) {
                    if (loader.npm && refPkg && !utils.path.startsWithDotSlash(name)) {
                        var nameAndVersion = name + '@' + refPkg.resolutions[name];
                        var pkg = loader.npm[nameAndVersion];
                        return pkg;
                    }
                },
                findDepWalking: function (loader, refPackage, name) {
                    if (loader.npm && refPackage && !utils.path.startsWithDotSlash(name)) {
                        var curPackage = utils.path.depPackageDir(refPackage.fileUrl, name);
                        while (curPackage) {
                            var pkg = loader.npmPaths[curPackage];
                            if (pkg) {
                                return pkg;
                            }
                            var parentAddress = utils.path.parentNodeModuleAddress(curPackage);
                            if (!parentAddress) {
                                return;
                            }
                            curPackage = parentAddress + '/' + name;
                        }
                    }
                },
                findByName: function (loader, name) {
                    if (loader.npm && !utils.path.startsWithDotSlash(name)) {
                        return loader.npm[name];
                    }
                },
                findByNameAndVersion: function (loader, name, version) {
                    if (loader.npm && !utils.path.startsWithDotSlash(name)) {
                        var nameAndVersion = name + '@' + version;
                        return loader.npm[nameAndVersion];
                    }
                },
                findByUrl: function (loader, url) {
                    if (loader.npm) {
                        var fullUrl = utils.pkg.folderAddress(url);
                        return loader.npmPaths[fullUrl];
                    }
                },
                directoriesLib: function (pkg) {
                    var steal = utils.pkg.config(pkg);
                    var lib = steal && steal.directories && steal.directories.lib;
                    var ignores = [
                            '.',
                            '/'
                        ], ignore;
                    if (!lib)
                        return undefined;
                    while (!!(ignore = ignores.shift())) {
                        if (lib[0] === ignore) {
                            lib = lib.substr(1);
                        }
                    }
                    return lib;
                },
                hasDirectoriesLib: function (pkg) {
                    var steal = utils.pkg.config(pkg);
                    return steal && steal.directories && !!steal.directories.lib;
                },
                findPackageInfo: function (context, pkg) {
                    var pkgInfo = context.pkgInfo;
                    if (pkgInfo) {
                        var out;
                        utils.forEach(pkgInfo, function (p) {
                            if (pkg.name === p.name && pkg.version === p.version) {
                                out = p;
                            }
                        });
                        return out;
                    }
                },
                saveResolution: function (context, refPkg, pkg) {
                    var npmPkg = utils.pkg.findPackageInfo(context, refPkg);
                    npmPkg.resolutions[pkg.name] = refPkg.resolutions[pkg.name] = pkg.version;
                },
                config: function (pkg) {
                    return pkg.steal || pkg.system;
                }
            },
            path: {
                makeRelative: function (path) {
                    if (utils.path.isRelative(path) && path.substr(0, 1) !== '/') {
                        return path;
                    } else {
                        return './' + path;
                    }
                },
                removeJS: function (path) {
                    return path.replace(/\.js(!|$)/, function (whole, part) {
                        return part;
                    });
                },
                removePackage: function (path) {
                    return path.replace(/\/package\.json.*/, '');
                },
                addJS: function (path) {
                    if (/\.m?js(on)?$/.test(path)) {
                        return path;
                    } else {
                        return path + '.js';
                    }
                },
                isRelative: function (path) {
                    return path.substr(0, 1) === '.';
                },
                isInHomeDir: function (path, context) {
                    return path.substr(0, 2) === utils.pkg.homeAlias(context) + '/';
                },
                joinURIs: function (baseUri, rel) {
                    function removeDotSegments(input) {
                        var output = [];
                        input.replace(/^(\.\.?(\/|$))+/, '').replace(/\/(\.(\/|$))+/g, '/').replace(/\/\.\.$/, '/../').replace(/\/?[^\/]*/g, function (p) {
                            if (p === '/..') {
                                output.pop();
                            } else {
                                output.push(p);
                            }
                        });
                        return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
                    }
                    var href = parseURI(rel || '');
                    var base = parseURI(baseUri || '');
                    return !href || !base ? null : (href.protocol || base.protocol) + (href.protocol || href.authority ? href.authority : base.authority) + removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : href.pathname ? (base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname : base.pathname) + (href.protocol || href.authority || href.pathname ? href.search : href.search || base.search) + href.hash;
                },
                startsWithDotSlash: function (path) {
                    return path.substr(0, 2) === './';
                },
                removeDotSlash: function (path) {
                    return utils.path.startsWithDotSlash(path) ? path.substr(2) : path;
                },
                endsWithSlash: function (path) {
                    return path[path.length - 1] === '/';
                },
                addEndingSlash: function (path) {
                    return utils.path.endsWithSlash(path) ? path : path + '/';
                },
                depPackage: function (parentPackageAddress, childName) {
                    var packageFolderName = parentPackageAddress.replace(/\/package\.json.*/, '');
                    return (packageFolderName ? packageFolderName + '/' : '') + 'node_modules/' + childName + '/package.json';
                },
                peerPackage: function (parentPackageAddress, childName) {
                    var packageFolderName = parentPackageAddress.replace(/\/package\.json.*/, '');
                    return packageFolderName.substr(0, packageFolderName.lastIndexOf('/')) + '/' + childName + '/package.json';
                },
                depPackageDir: function (parentPackageAddress, childName) {
                    return utils.path.depPackage(parentPackageAddress, childName).replace(/\/package\.json.*/, '');
                },
                peerNodeModuleAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules);
                    if (nodeModulesIndex >= 0) {
                        return address.substr(0, nodeModulesIndex + nodeModules.length - 1);
                    }
                },
                parentNodeModuleAddress: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), prevModulesIndex = address.lastIndexOf(nodeModules, nodeModulesIndex - 1);
                    if (prevModulesIndex >= 0) {
                        return address.substr(0, prevModulesIndex + nodeModules.length - 1);
                    }
                },
                pkgDir: function (address) {
                    var nodeModules = '/node_modules/', nodeModulesIndex = address.lastIndexOf(nodeModules), nextSlash = address.indexOf('/', nodeModulesIndex + nodeModules.length);
                    if (address[nodeModulesIndex + nodeModules.length] === '@') {
                        nextSlash = address.indexOf('/', nextSlash + 1);
                    }
                    if (nodeModulesIndex >= 0) {
                        return nextSlash >= 0 ? address.substr(0, nextSlash) : address;
                    }
                },
                basename: function (address) {
                    var parts = address.split('/');
                    return parts[parts.length - 1];
                },
                relativeTo: function (modulePath, rel) {
                    var parts = modulePath.split('/');
                    var idx = 1;
                    while (rel[idx] === '.') {
                        parts.pop();
                        idx++;
                    }
                    return parts.join('/');
                },
                isPackageRootDir: function (pth) {
                    return pth.indexOf('/') === -1;
                }
            },
            json: {
                transform: function (loader, load, data) {
                    data.steal = utils.pkg.config(data);
                    var fn = loader.jsonOptions && loader.jsonOptions.transform;
                    if (!fn)
                        return data;
                    return fn.call(loader, load, data);
                }
            },
            includeInBuild: true
        };
        function parseURI(url) {
            var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@\/]*(?::[^:@\/]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
            return m ? {
                href: m[0] || '',
                protocol: m[1] || '',
                authority: m[2] || '',
                host: m[3] || '',
                hostname: m[4] || '',
                port: m[5] || '',
                pathname: m[6] || '',
                search: m[7] || '',
                hash: m[8] || ''
            } : null;
        }
        module.exports = utils;
    }(function () {
        return this;
    }(), require, exports, module));
});
/*npm-extension*/
define('npm-extension', [
    'require',
    'exports',
    'module',
    '@steal',
    './npm-utils'
], function (require, exports, module) {
    (function (global, require, exports, module) {
        'format cjs';
        var steal = require('@steal');
        var utils = require('./npm-utils');
        exports.includeInBuild = true;
        var isNode = typeof process === 'object' && {}.toString.call(process) === '[object process]';
        var isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
        var isElectron = isNode && !!process.versions.electron;
        var isBrowser = typeof window !== 'undefined' && (!isNode || isElectron) && !isWorker;
        exports.addExtension = function (System) {
            if (System._extensions) {
                System._extensions.push(exports.addExtension);
            }
            var oldNormalize = System.normalize;
            System.normalize = function (identifier, parentModuleName, parentAddress, pluginNormalize) {
                var name = identifier;
                var parentName = parentModuleName;
                if (parentName && this.npmParentMap && this.npmParentMap[parentName]) {
                    parentName = this.npmParentMap[parentName];
                }
                var hasNoParent = !parentName;
                var nameIsRelative = utils.path.isRelative(name);
                var parentIsNpmModule = utils.moduleName.isNpm(parentName);
                var identifierEndsWithSlash = utils.path.endsWithSlash(name);
                if (parentName && nameIsRelative && !parentIsNpmModule) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                if (utils.moduleName.isConditional(name)) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                var hasContextualMap = typeof this.map[parentName] === 'object' && this.map[parentName][name];
                if (hasContextualMap) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                var refPkg = utils.pkg.findByModuleNameOrAddress(this, parentName, parentAddress);
                if (!refPkg) {
                    return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                }
                var isPointingAtParentFolder = name === '../' || name === './';
                if (parentIsNpmModule && isPointingAtParentFolder) {
                    var parsedParentModuleName = utils.moduleName.parse(parentName);
                    var parentModulePath = parsedParentModuleName.modulePath || '';
                    var relativePath = utils.path.relativeTo(parentModulePath, name);
                    var isInRoot = utils.path.isPackageRootDir(relativePath);
                    if (isInRoot) {
                        name = refPkg.name + '#' + utils.path.removeJS(utils.path.removeDotSlash(refPkg.main));
                    } else {
                        name = name + 'index';
                    }
                }
                var parsedModuleName = utils.moduleName.parseFromPackage(this, refPkg, name, parentName);
                var isRoot = utils.pkg.isRoot(this, refPkg);
                var parsedPackageNameIsReferringPackage = parsedModuleName.packageName === refPkg.name;
                var isRelativeToParentNpmModule = parentIsNpmModule && nameIsRelative && parsedPackageNameIsReferringPackage;
                var depPkg, wantedPkg;
                if (isRelativeToParentNpmModule) {
                    depPkg = refPkg;
                }
                var context = this.npmContext;
                var crawl = context && context.crawl;
                var isDev = !!crawl;
                if (!depPkg) {
                    if (crawl) {
                        var parentPkg = nameIsRelative ? null : crawl.matchedVersion(context, refPkg.name, refPkg.version);
                        if (parentPkg) {
                            var depMap = crawl.getFullDependencyMap(this, parentPkg, isRoot);
                            wantedPkg = depMap[parsedModuleName.packageName];
                            if (wantedPkg) {
                                var wantedVersion = refPkg.resolutions && refPkg.resolutions[wantedPkg.name] || wantedPkg.version;
                                var foundPkg = crawl.matchedVersion(this.npmContext, wantedPkg.name, wantedVersion);
                                if (foundPkg) {
                                    depPkg = utils.pkg.findByUrl(this, foundPkg.fileUrl);
                                }
                            }
                        }
                    } else {
                        if (isRoot) {
                            depPkg = utils.pkg.findDepWalking(this, refPkg, parsedModuleName.packageName);
                        } else {
                            depPkg = utils.pkg.findDep(this, refPkg, parsedModuleName.packageName);
                        }
                    }
                }
                if (parsedPackageNameIsReferringPackage) {
                    depPkg = utils.pkg.findByNameAndVersion(this, parsedModuleName.packageName, refPkg.version);
                }
                var lookupByName = parsedModuleName.isGlobal || hasNoParent;
                if (!depPkg) {
                    depPkg = utils.pkg.findByName(this, parsedModuleName.packageName);
                }
                var isThePackageWeWant = !isDev || !depPkg || (wantedPkg ? crawl.pkgSatisfies(depPkg, wantedPkg.version) : true);
                if (!isThePackageWeWant) {
                    depPkg = undefined;
                } else if (isDev && depPkg) {
                    utils.pkg.saveResolution(context, refPkg, depPkg);
                }
                if (!depPkg) {
                    var browserPackageName = this.globalBrowser[parsedModuleName.packageName];
                    if (browserPackageName) {
                        parsedModuleName.packageName = browserPackageName.moduleName;
                        depPkg = utils.pkg.findByName(this, parsedModuleName.packageName);
                    }
                }
                if (!depPkg && isRoot && name === refPkg.main && utils.pkg.hasDirectoriesLib(refPkg)) {
                    parsedModuleName.version = refPkg.version;
                    parsedModuleName.packageName = refPkg.name;
                    parsedModuleName.modulePath = utils.pkg.main(refPkg);
                    return oldNormalize.call(this, utils.moduleName.create(parsedModuleName), parentName, parentAddress, pluginNormalize);
                }
                var loader = this;
                if (!depPkg) {
                    if (crawl) {
                        var parentPkg = crawl.matchedVersion(this.npmContext, refPkg.name, refPkg.version);
                        if (parentPkg) {
                            var depMap = crawl.getFullDependencyMap(this, parentPkg, isRoot);
                            depPkg = depMap[parsedModuleName.packageName];
                            if (!depPkg) {
                                var parents = crawl.findPackageAndParents(this.npmContext, parsedModuleName.packageName);
                                if (parents) {
                                    depPkg = parents.package;
                                }
                            }
                        }
                    }
                    if (!depPkg) {
                        if (refPkg.browser && refPkg.browser[name]) {
                            return oldNormalize.call(this, refPkg.browser[name], parentName, parentAddress, pluginNormalize);
                        }
                        var steal = utils.pkg.config(refPkg);
                        if (steal && steal.map && typeof steal.map[name] === 'string') {
                            var mappedName = steal.map[name];
                            var envConfig = steal.envs && steal.envs[loader.env];
                            if (envConfig && envConfig.map && typeof envConfig.map[name] === 'string') {
                                mappedName = envConfig.map[name];
                            }
                            return loader.normalize(mappedName, parentName, parentAddress, pluginNormalize);
                        } else {
                            return oldNormalize.call(this, name, parentName, parentAddress, pluginNormalize);
                        }
                    }
                    return crawl.dep(this.npmContext, parentPkg, refPkg, depPkg, isRoot).then(createModuleNameAndNormalize);
                } else {
                    return createModuleNameAndNormalize(depPkg);
                }
                function createModuleNameAndNormalize(depPkg) {
                    parsedModuleName.version = depPkg.version;
                    if (!parsedModuleName.modulePath) {
                        parsedModuleName.modulePath = utils.pkg.main(depPkg);
                    }
                    var p = oldNormalize.call(loader, utils.moduleName.create(parsedModuleName), parentName, parentAddress, pluginNormalize);
                    if (identifierEndsWithSlash) {
                        p.then(function (name) {
                            if (context && context.forwardSlashMap) {
                                context.forwardSlashMap[name] = true;
                            }
                        });
                    }
                    return p;
                }
            };
            var oldLocate = System.locate;
            System.locate = function (load) {
                var parsedModuleName = utils.moduleName.parse(load.name), loader = this;
                var pmn = load.metadata.parsedModuleName = parsedModuleName;
                load.metadata.npmPackage = utils.pkg.findByNameAndVersion(this, pmn.packageName, pmn.version);
                if (parsedModuleName.version && this.npm && !loader.paths[load.name]) {
                    var pkg = this.npm[utils.moduleName.nameAndVersion(parsedModuleName)];
                    if (pkg) {
                        return oldLocate.call(this, load).then(function (locatedAddress) {
                            var address = locatedAddress;
                            var expectedAddress = utils.path.joinURIs(System.baseURL, load.name);
                            if (isBrowser) {
                                expectedAddress = expectedAddress.replace(/#/g, '%23');
                            }
                            if (address !== expectedAddress + '.js' && address !== expectedAddress) {
                                return address;
                            }
                            var root = utils.pkg.rootDir(pkg, utils.pkg.isRoot(loader, pkg));
                            if (parsedModuleName.modulePath) {
                                var npmAddress = utils.path.joinURIs(utils.path.addEndingSlash(root), parsedModuleName.plugin ? parsedModuleName.modulePath : utils.path.addJS(parsedModuleName.modulePath));
                                address = typeof steal !== 'undefined' ? utils.path.joinURIs(loader.baseURL, npmAddress) : npmAddress;
                            }
                            return address;
                        });
                    }
                }
                return oldLocate.call(this, load);
            };
            var oldFetch = System.fetch;
            System.fetch = function (load) {
                if (load.metadata.dryRun) {
                    return oldFetch.apply(this, arguments);
                }
                var loader = this;
                var context = loader.npmContext;
                var fetchPromise = Promise.resolve(oldFetch.apply(this, arguments));
                if (utils.moduleName.isNpm(load.name)) {
                    fetchPromise = fetchPromise.then(null, function (err) {
                        var statusCode = err.statusCode;
                        if (statusCode !== 404 && statusCode !== 0) {
                            return Promise.reject(err);
                        }
                        if (!loader.npmContext) {
                            loader.npmContext = { forwardSlashMap: {} };
                        }
                        var types = [].slice.call(retryTypes);
                        return retryAll(types, err).then(null, function (e) {
                            return Promise.reject(err);
                        });
                        function retryAll(types, err) {
                            if (!types.length) {
                                throw err;
                            }
                            var type = types.shift();
                            if (!type.test(load)) {
                                throw err;
                            }
                            return Promise.resolve(retryFetch.call(loader, load, type)).then(null, function (err) {
                                return retryAll(types, err);
                            });
                        }
                    });
                }
                return fetchPromise.catch(function (error) {
                    var statusCode = error.statusCode;
                    if ((statusCode === 404 || statusCode === 0) && utils.moduleName.isBareIdentifier(load.name) && !utils.pkg.isRoot(loader, load.metadata.npmPackage)) {
                        var newError = new Error([
                            'Could not load \'' + load.name + '\'',
                            'Is this an npm module not saved in your package.json?'
                        ].join('\n'));
                        newError.statusCode = error.statusCode;
                        throw newError;
                    } else {
                        throw error;
                    }
                });
            };
            var convertName = function (loader, name) {
                var pkg = utils.pkg.findByName(loader, name.split('/')[0]);
                if (pkg) {
                    var parsed = utils.moduleName.parse(name, pkg.name);
                    parsed.version = pkg.version;
                    if (!parsed.modulePath) {
                        parsed.modulePath = utils.pkg.main(pkg);
                    }
                    return utils.moduleName.create(parsed);
                }
                return name;
            };
            var configSpecial = {
                map: function (map) {
                    var newMap = {}, val;
                    for (var name in map) {
                        val = map[name];
                        newMap[convertName(this, name)] = typeof val === 'object' ? configSpecial.map(val) : convertName(this, val);
                    }
                    return newMap;
                },
                meta: function (map) {
                    var newMap = {};
                    for (var name in map) {
                        newMap[convertName(this, name)] = map[name];
                    }
                    return newMap;
                },
                paths: function (paths) {
                    var newPaths = {};
                    for (var name in paths) {
                        newPaths[convertName(this, name)] = paths[name];
                    }
                    return newPaths;
                }
            };
            var oldConfig = System.config;
            System.config = function (cfg) {
                var loader = this;
                if (loader.npmContext) {
                    var context = loader.npmContext;
                    var pkg = context.versions.__default;
                    var conv = context.convert.steal(context, pkg, cfg, true);
                    context.convert.updateConfigOnPackageLoad(conv, false, true, context.applyBuildConfig);
                    oldConfig.apply(loader, arguments);
                    return;
                }
                for (var name in cfg) {
                    if (configSpecial[name]) {
                        cfg[name] = configSpecial[name].call(loader, cfg[name]);
                    }
                }
                oldConfig.apply(loader, arguments);
            };
            var newLoader = System._newLoader || Function.prototype;
            System._newLoader = function (loader) {
                loader.npmContext = this.npmContext;
                loader.npmParentMap = this.npmParentMap;
                return newLoader.apply(this, arguments);
            };
            steal.addNpmPackages = function (npmPackages) {
                var packages = npmPackages || [];
                var loader = this.loader;
                for (var i = 0; i < packages.length; i += 1) {
                    var pkg = packages[i];
                    var path = pkg && pkg.fileUrl;
                    if (path) {
                        loader.npmContext.paths[path] = pkg;
                    }
                }
            };
            steal.getNpmPackages = function () {
                var context = this.loader.npmContext;
                return context ? context.packages || [] : [];
            };
            function retryFetch(load, type) {
                var loader = this;
                var moduleName = typeof type.name === 'function' ? type.name(loader, load) : load.name + type.name;
                var local = utils.extend({}, load);
                local.name = moduleName;
                local.metadata = { dryRun: true };
                return Promise.resolve(loader.locate(local)).then(function (address) {
                    local.address = address;
                    return loader.fetch(local);
                }).then(function (source) {
                    load.metadata.address = local.address;
                    loader.npmParentMap[load.name] = local.name;
                    var npmLoad = loader.npmContext && loader.npmContext.npmLoad;
                    if (npmLoad) {
                        npmLoad.saveLoadIfNeeded(loader.npmContext);
                        if (!isNode) {
                            utils.warnOnce('Some 404s were encountered ' + 'while loading. Don\'t panic! ' + 'These will only happen in dev ' + 'and are harmless.');
                        }
                    }
                    return source;
                });
            }
            var retryTypes = [
                {
                    name: function (loader, load) {
                        var context = loader.npmContext;
                        if (context.forwardSlashMap[load.name]) {
                            var parts = load.name.split('/');
                            parts.pop();
                            return parts.concat(['index']).join('/');
                        }
                        return load.name + '/index';
                    },
                    test: function () {
                        return true;
                    }
                },
                {
                    name: '.json',
                    test: function (load) {
                        return utils.moduleName.isNpm(load.name) && utils.path.basename(load.address) === 'package.js';
                    }
                }
            ];
        };
    }(function () {
        return this;
    }(), require, exports, module));
});
/*node_modules/steal-conditional/conditional*/
define('node_modules/steal-conditional/conditional', [
    'module',
    'exports'
], function (module, exports) {
    exports.extensionBuilder = 'steal-conditional/slim';
    function addConditionals(loader) {
        var conditionalRegEx = /#\{[^\}]+\}|#\?.+$/;
        var isNode = typeof process === 'object' && {}.toString.call(process) === '[object process]';
        if (loader._extensions) {
            loader._extensions.push(addConditionals);
        }
        loader.set('@@conditional-helpers', loader.newModule({
            isConditionalModuleName: function (moduleName) {
                return conditionalRegEx.test(moduleName);
            }
        }));
        var normalize = loader.normalize;
        function readMemberExpression(p, value) {
            var pParts = p.split('.');
            while (pParts.length) {
                value = value[pParts.shift()];
            }
            return value;
        }
        function includeInBuild(loader, name) {
            var load = loader.getModuleLoad(name);
            load.metadata.includeInBuild = true;
        }
        function getGlob() {
            if (isNode) {
                return loader.import('@node-require', { name: module.id }).then(function (nodeRequire) {
                    return nodeRequire('glob');
                });
            }
            return Promise.resolve();
        }
        function pushIfUnique(array, item) {
            return array.indexOf(item) === -1 ? array.push(item) : array.length;
        }
        function getModuleName(nameWithConditional, variation) {
            var modName;
            var conditionIndex = nameWithConditional.search(conditionalRegEx);
            var lastSlashIndex = nameWithConditional.indexOf('/', nameWithConditional.indexOf('}'));
            if (lastSlashIndex !== -1) {
                modName = nameWithConditional.substr(0, conditionIndex) + variation;
            } else {
                modName = nameWithConditional.replace(conditionalRegEx, variation);
            }
            return modName;
        }
        loader.normalize = function (name, parentName, parentAddress, pluginNormalize) {
            var loader = this;
            var conditionalMatch = name.match(conditionalRegEx);
            if (conditionalMatch) {
                var substitution = conditionalMatch[0][1] !== '?';
                var conditionModule = substitution ? conditionalMatch[0].substr(2, conditionalMatch[0].length - 3) : conditionalMatch[0].substr(2);
                var conditionExport = 'default';
                var conditionExportParts = conditionModule.match(/^(?:\.\/|\.\.\/)+/);
                var conditionExportIndex = conditionModule.indexOf('.', conditionExportParts && conditionExportParts[0].length);
                if (conditionExportIndex !== -1) {
                    conditionExport = conditionModule.substr(conditionExportIndex + 1);
                    conditionModule = conditionModule.substr(0, conditionExportIndex);
                }
                var booleanNegation = !substitution && conditionModule[0] === '~';
                if (booleanNegation) {
                    conditionModule = conditionModule.substr(1);
                }
                var handleConditionalBuild = function () {
                };
                var handleConditionalEval = function (m) {
                    var conditionValue = typeof m === 'object' ? readMemberExpression(conditionExport, m) : m;
                    if (substitution) {
                        if (typeof conditionValue !== 'string') {
                            throw new TypeError('The condition value for ' + conditionalMatch[0] + ' doesn\'t resolve to a string.');
                        }
                        name = name.replace(conditionalRegEx, conditionValue);
                    } else {
                        if (typeof conditionValue !== 'boolean') {
                            throw new TypeError('The condition value for ' + conditionalMatch[0] + ' isn\'t resolving to a boolean.');
                        }
                        if (booleanNegation) {
                            conditionValue = !conditionValue;
                        }
                        if (!conditionValue) {
                            name = '@empty';
                        } else {
                            name = name.replace(conditionalRegEx, '');
                        }
                    }
                    if (name === '@empty') {
                        return normalize.call(loader, name, parentName, parentAddress, pluginNormalize);
                    } else {
                        return loader.normalize.call(loader, name, parentName, parentAddress, pluginNormalize);
                    }
                };
                var isBuild = (loader.env || '').indexOf('build') === 0;
                var pluginLoader = isBuild ? loader : loader.pluginLoader || loader;
                return pluginLoader['import'](conditionModule, {
                    name: parentName,
                    address: parentAddress
                }).then(function (m) {
                    return pluginLoader.normalize(conditionModule, parentName, parentAddress, pluginNormalize).then(function (fullName) {
                        includeInBuild(pluginLoader, fullName);
                        return m;
                    });
                }).then(function (m) {
                    return isBuild ? handleConditionalBuild() : handleConditionalEval(m);
                });
            }
            return Promise.resolve(normalize.call(loader, name, parentName, parentAddress, pluginNormalize));
        };
    }
    if (typeof System !== 'undefined') {
        addConditionals(System);
    }
});
/*npm-load*/
define('npm-load', [], function(){ return {}; });
/*semver*/
define('semver', [], function(){ return {}; });
/*npm-crawl*/
define('npm-crawl', [], function(){ return {}; });
/*npm-convert*/
define('npm-convert', [], function(){ return {}; });
/*npm*/
define('npm', [], function(){ return {}; });
/*package.json!npm*/
define('package.json!npm', [
    '@loader',
    'npm-extension',
    'module',
    './node_modules/steal-conditional/conditional'
], function (loader, npmExtension, module) {
    npmExtension.addExtension(loader);
    if (!loader.main) {
        loader.main = 'steal-conditional-culling-imports@1.0.0#index';
    }
    loader._npmExtensions = [].slice.call(arguments, 2);
    (function (loader, packages, options) {
        var g = loader.global;
        if (!g.process) {
            g.process = {
                argv: [],
                cwd: function () {
                    var baseURL = loader.baseURL;
                    return baseURL;
                },
                browser: true,
                env: { NODE_ENV: loader.env },
                version: '',
                platform: navigator && navigator.userAgent && /Windows/.test(navigator.userAgent) ? 'win' : ''
            };
        }
        if (!loader.npm) {
            loader.npm = {};
            loader.npmPaths = {};
            loader.globalBrowser = {};
        }
        if (!loader.npmParentMap) {
            loader.npmParentMap = options.npmParentMap || {};
        }
        var rootPkg = loader.npmPaths.__default = packages[0];
        var rootConfig = rootPkg.steal || rootPkg.system;
        var lib = rootConfig && rootConfig.directories && rootConfig.directories.lib;
        var setGlobalBrowser = function (globals, pkg) {
            for (var name in globals) {
                loader.globalBrowser[name] = {
                    pkg: pkg,
                    moduleName: globals[name]
                };
            }
        };
        var setInNpm = function (name, pkg) {
            if (!loader.npm[name]) {
                loader.npm[name] = pkg;
            }
            loader.npm[name + '@' + pkg.version] = pkg;
        };
        var forEach = function (arr, fn) {
            var i = 0, len = arr.length;
            for (; i < len; i++) {
                res = fn.call(arr, arr[i], i);
                if (res === false)
                    break;
            }
        };
        var setupLiveReload = function () {
            if (loader.liveReloadInstalled) {
                loader['import']('live-reload', { name: module.id }).then(function (reload) {
                    reload.dispose(function () {
                        var pkgInfo = loader.npmContext.pkgInfo;
                        delete pkgInfo[rootPkg.name + '@' + rootPkg.version];
                        var idx = -1;
                        forEach(pkgInfo, function (pkg, i) {
                            if (pkg.name === rootPkg.name && pkg.version === rootPkg.version) {
                                idx = i;
                                return false;
                            }
                        });
                        pkgInfo.splice(idx, 1);
                    });
                });
            }
        };
        var ignoredConfig = [
            'bundle',
            'configDependencies',
            'transpiler',
            'treeShaking'
        ];
        packages.reverse();
        forEach(packages, function (pkg) {
            var steal = pkg.steal || pkg.system;
            if (steal) {
                var main = steal.main;
                delete steal.main;
                var configDeps = steal.configDependencies;
                if (pkg !== rootPkg) {
                    forEach(ignoredConfig, function (name) {
                        delete steal[name];
                    });
                }
                loader.config(steal);
                if (pkg === rootPkg) {
                    steal.configDependencies = configDeps;
                }
                steal.main = main;
            }
            if (pkg.globalBrowser) {
                var doNotApplyGlobalBrowser = pkg.name === 'steal' && rootConfig.builtins === false;
                if (!doNotApplyGlobalBrowser) {
                    setGlobalBrowser(pkg.globalBrowser, pkg);
                }
            }
            var systemName = steal && steal.name;
            if (systemName) {
                setInNpm(systemName, pkg);
            } else {
                setInNpm(pkg.name, pkg);
            }
            if (!loader.npm[pkg.name]) {
                loader.npm[pkg.name] = pkg;
            }
            loader.npm[pkg.name + '@' + pkg.version] = pkg;
            var pkgAddress = pkg.fileUrl.replace(/\/package\.json.*/, '');
            loader.npmPaths[pkgAddress] = pkg;
        });
        setupLiveReload();
        forEach(loader._npmExtensions || [], function (ext) {
            if (ext.systemConfig) {
                loader.config(ext.systemConfig);
            }
        });
    }(loader, [
        {
            'name': 'steal-conditional-culling-imports',
            'version': '1.0.0',
            'fileUrl': './package.json',
            'main': 'index.js',
            'steal': {
                'configDependencies': ['./node_modules/steal-conditional/conditional'],
                'npmAlgorithm': 'flat'
            },
            'resolutions': { 'steal-conditional-culling-imports': '1.0.0' }
        },
        {
            'name': 'steal',
            'version': '2.1.6',
            'fileUrl': './node_modules/steal/package.json',
            'main': 'main',
            'steal': {
                'npmDependencies': {
                    'console-browserify': true,
                    'constants-browserify': true,
                    'crypto-browserify': true,
                    'http-browserify': true,
                    'buffer': true,
                    'os-browserify': true,
                    'vm-browserify': true,
                    'zlib-browserify': true,
                    'assert': true,
                    'domain-browser': true,
                    'events': true,
                    'https-browserify': true,
                    'path-browserify': true,
                    'string_decoder': true,
                    'tty-browserify': true,
                    'process': true,
                    'punycode': true
                }
            },
            'globalBrowser': {
                'console': 'console-browserify',
                'constants': 'constants-browserify',
                'crypto': 'crypto-browserify',
                'http': 'http-browserify',
                'buffer': 'buffer',
                'os': 'os-browserify',
                'vm': 'vm-browserify',
                'zlib': 'zlib-browserify',
                'assert': 'assert',
                'child_process': 'steal#ext/builtin/child_process',
                'cluster': 'steal#ext/builtin/cluster',
                'dgram': 'steal#ext/builtin/dgram',
                'dns': 'steal#ext/builtin/dns',
                'domain': 'domain-browser',
                'events': 'events',
                'fs': 'steal#ext/builtin/fs',
                'https': 'https-browserify',
                'module': 'steal#ext/builtin/module',
                'net': 'steal#ext/builtin/net',
                'path': 'path-browserify',
                'process': 'process',
                'querystring': 'steal#ext/builtin/querystring',
                'readline': 'steal#ext/builtin/readline',
                'repl': 'steal#ext/builtin/repl',
                'stream': 'steal#ext/builtin/stream',
                'string_decoder': 'string_decoder',
                'sys': 'steal#ext/builtin/sys',
                'timers': 'steal#ext/builtin/timers',
                'tls': 'steal#ext/builtin/tls',
                'tty': 'tty-browserify',
                'url': 'steal#ext/builtin/url',
                'util': 'steal#ext/builtin/util',
                '_stream_readable': 'steal#ext/builtin/_stream_readable',
                '_stream_writable': 'steal#ext/builtin/_stream_writable',
                '_stream_duplex': 'steal#ext/builtin/_stream_duplex',
                '_stream_transform': 'steal#ext/builtin/_stream_transform',
                '_stream_passthrough': 'steal#ext/builtin/_stream_passthrough'
            },
            'resolutions': {}
        },
        {
            'name': 'assert',
            'version': '1.4.1',
            'fileUrl': './node_modules/assert/package.json',
            'main': './assert.js',
            'resolutions': {}
        },
        {
            'name': 'buffer',
            'version': '5.0.8',
            'fileUrl': './node_modules/buffer/package.json',
            'main': 'index.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'console-browserify',
            'version': '1.1.0',
            'fileUrl': './node_modules/console-browserify/package.json',
            'main': 'index',
            'resolutions': {}
        },
        {
            'name': 'constants-browserify',
            'version': '1.0.0',
            'fileUrl': './node_modules/constants-browserify/package.json',
            'main': 'constants.json',
            'resolutions': {}
        },
        {
            'name': 'crypto-browserify',
            'version': '3.11.1',
            'fileUrl': './node_modules/crypto-browserify/package.json',
            'browser': { 'crypto': '@empty' },
            'resolutions': {}
        },
        {
            'name': 'domain-browser',
            'version': '1.1.7',
            'fileUrl': './node_modules/domain-browser/package.json',
            'main': './index.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'events',
            'version': '1.1.1',
            'fileUrl': './node_modules/events/package.json',
            'main': './events.js',
            'resolutions': {}
        },
        {
            'name': 'http-browserify',
            'version': '1.7.0',
            'fileUrl': './node_modules/http-browserify/package.json',
            'main': 'index.js',
            'browser': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'https-browserify',
            'version': '1.0.0',
            'fileUrl': './node_modules/https-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'os-browserify',
            'version': '0.3.0',
            'fileUrl': './node_modules/os-browserify/package.json',
            'main': 'main.js',
            'browser': 'browser.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'path-browserify',
            'version': '0.0.1',
            'fileUrl': './node_modules/path-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'process',
            'version': '0.11.10',
            'fileUrl': './node_modules/process/package.json',
            'main': './index.js',
            'browser': './browser.js',
            'resolutions': {}
        },
        {
            'name': 'punycode',
            'version': '2.0.1',
            'fileUrl': './node_modules/punycode/package.json',
            'main': 'punycode.js',
            'jspm': {},
            'resolutions': {}
        },
        {
            'name': 'string_decoder',
            'version': '1.0.3',
            'fileUrl': './node_modules/string_decoder/package.json',
            'main': 'lib/string_decoder.js',
            'resolutions': {}
        },
        {
            'name': 'tty-browserify',
            'version': '0.0.1',
            'fileUrl': './node_modules/tty-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'vm-browserify',
            'version': '0.0.4',
            'fileUrl': './node_modules/vm-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        },
        {
            'name': 'zlib-browserify',
            'version': '0.0.3',
            'fileUrl': './node_modules/zlib-browserify/package.json',
            'main': 'index.js',
            'resolutions': {}
        }
    ], { 'npmParentMap': {} }));
});
/*babel*/
define('babel', [], function(){ return {}; });
/*steal-conditional-culling-imports@1.0.0#index*/
define('steal-conditional-culling-imports@1.0.0#index', ['~/lib/file'], function (_file) {
    'use strict';
    var _file2 = _interopRequireDefault(_file);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    console.log(_file2.default);
});
/*steal-conditional-culling-imports@1.0.0#lib/a-or-b*/
define('steal-conditional-culling-imports@1.0.0#lib/a-or-b', ['exports'], function (exports) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    var aOrB = System.isPlatform('window') ? 'a' : 'b';
    exports.default = aOrB;
});
/*always-false*/
define('always-false', ['exports'], function (exports) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    exports.default = false;
});
/*steal-conditional-culling-imports@1.0.0#lib/file*/
define('steal-conditional-culling-imports@1.0.0#lib/file', [
    'exports',
    '~/lib/file-#{~/lib/a-or-b}',
    '~/lib/file-a#?always-false',
    '~/lib/file-b#?always-false'
], function (exports, _aOrB) {
    'use strict';
    Object.defineProperty(exports, '__esModule', { value: true });
    var _aOrB2 = _interopRequireDefault(_aOrB);
    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
    }
    exports.default = _aOrB2.default;
});
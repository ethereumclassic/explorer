var BlocksApp = angular.module("BlocksApp", [
    "ui.router", 
    "ui.bootstrap", 
    "oc.lazyLoad",  
    "ngSanitize"
]); 
BlocksApp.constant('_', window._); // loadsh
BlocksApp.config(['$ocLazyLoadProvider',  '$locationProvider', 
    function($ocLazyLoadProvider, $locationProvider) {
    $ocLazyLoadProvider.config({
        cssFilesInsertBefore: 'ng_load_plugins_before' // load the above css files before a LINK element with this ID. Dynamic CSS files must be loaded between core and theme css files
    });
    $locationProvider.html5Mode({
      enabled: true
    });
}]);
/* Setup global settings */
BlocksApp.factory('settings', ['$rootScope', '$http', function($rootScope, $http) {
    // supported languages
    var settings = {
        layout: {
            pageSidebarClosed: false, // sidebar menu state
            pageContentWhite: false, // set page content layout
            pageBodySolid: false, // solid body color state
            pageAutoScrollOnLoad: 1000 // auto scroll to top on page load
        },
        assetsPath: '/',
        globalPath: '/',
        layoutPath: '/',
    };

    $rootScope.settings = settings;
    return settings;
}]);

/* Load config settings */
BlocksApp.factory('setupObj', ['$rootScope', '$http', function($rootScope, $http) {
    return $http.get('/config').then(function(res) {
        return res.data;
    })
}]);

/* Setup App Main Controller */
BlocksApp.controller('MainController', ['$scope', '$rootScope', function($scope, $rootScope) {
    $scope.$on('$viewContentLoaded', function() {
        //App.initComponents(); // init core components
        //Layout.init(); //  Init entire layout(header, footer, sidebar, etc) on page load if the partials included in server side instead of loading with ng-include directive 
    });
}]);

/***
Layout Partials.
By default the partials are loaded through AngularJS ng-include directive.
***/
/* Setup Layout Part - Header */
BlocksApp.controller('HeaderController', ['$scope', '$location', 'setupObj', function($scope, $location, setupObj) {
    $scope.$on('$includeContentLoaded', function() {
        Layout.initHeader(); // init header
    });
    $scope.form = {};
    $scope.searchQuery = function(s) {
        var search = s.toLowerCase();

        $scope.form.searchInput="";
        $scope.form.searchForm.$setPristine();
        $scope.form.searchForm.$setUntouched();
        if (isAddress(search)) 
            $location.path("/addr/" + search);
        else if (isTransaction(search))
            $location.path("/tx/" + search);
        else if (!isNaN(search))
            $location.path("/block/" + search);
        else 
            $scope.form.searchInput = search;
    }
    setupObj.then(function(res) {
        $scope.settings = res;
    });
}]);
/* Search Bar */
BlocksApp.controller('PageHeadController', ['$scope', 'setupObj', function($scope, setupObj) {
    $scope.$on('$includeContentLoaded', function() {        
        
    });
    setupObj.then(function(res) {
        $scope.settings = res;
    });
}]);
/* Setup Layout Part - Footer */
BlocksApp.controller('FooterController', ['$scope', 'setupObj', function($scope, setupObj) {
    $scope.$on('$includeContentLoaded', function() {
        Layout.initFooter(); // init footer
    });
    setupObj.then(function(res) {
        $scope.settings = res;
    });
}]);
/* Setup Rounting For All Pages */
BlocksApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    // Redirect any unmatched url
    $urlRouterProvider.otherwise("home");      
    $stateProvider
        // Dashboard
        .state('home', {
            url: "/home",
            templateUrl: "views/home.html",            
            data: {pageTitle: 'Blockchain Explorer'},
            controller: "HomeController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load([{
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                            '/js/controllers/HomeController.js',
                            '/css/todo-2.min.css'
                        ]}]);
                }]
            }
        })
        .state('address', {
            url: "/addr/{hash}",
            templateUrl: "views/address.html",
            data: {pageTitle: 'Address'},
            controller: "AddressController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', // load the above css files before '#ng_load_plugins_before'
                        files: [
                             '/js/controllers/AddressController.js',
                            '/plugins/datatables/datatables.min.css',
                            '/plugins/datatables/datatables.bootstrap.css',
                            '/plugins/datatables/datatables.all.min.js',
                            '/plugins/datatables/datatable.min.js'
                        ]
                    });
                }]
            }
        })
        .state('block', {
            url: "/block/{number}",
            templateUrl: "views/block.html",
            data: {pageTitle: 'Block'},
            controller: "BlockController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', // load the above css files before '#ng_load_plugins_before'
                        files: [
                             '/js/controllers/BlockController.js'
                        ]
                    });
                }]
            }
        })

        .state('uncle', {
            url: "/uncle/*number",
            templateUrl: "views/block.html",
            data: {pageTitle: 'Uncle'},
            controller: "UncleController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', // load the above css files before '#ng_load_plugins_before'
                        files: [
                             '/js/controllers/UncleController.js'
                        ]
                    });
                }]
            }
        })

        .state('tx', {
            url: "/tx/{hash}",
            templateUrl: "views/tx.html",
            data: {pageTitle: 'Transaction'},
            controller: "TxController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', // load the above css files before '#ng_load_plugins_before'
                        files: [
                             '/js/controllers/TxController.js'
                        ]
                    });
                }]
            }
        })
        .state('contract', {
            url: "/contract/{addr}",
            templateUrl: "views/contract.html",
            data: {pageTitle: 'Verify Contract'},
            controller: "ContractController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                             '/js/controllers/ContractController.js',
                             '/js/custom.js'
                         ]
                     });
                }]
            }
        })
        .state('stats', {
            url: "/stats/{chart}",
            templateUrl: "views/stats/index.html",
            data: {pageTitle: 'Statistics'},
            controller: "StatsController",
            resolve: {
                deps: ['$ocLazyLoad', '$stateParams', function($ocLazyLoad, $stateParams) {
                    return $ocLazyLoad.load({
                        insertBefore: '#ng_load_plugins_before', // load the above css files before '#ng_load_plugins_before'
                        files: [
                             '/js/controllers/StatsController.js',
                             '/css/stats.css',
                             "https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.10/d3.js",
                             "/plugins/async.min.js",
                             "/plugins/moment/moment.min.js"
                        ]
                    });
                }]
            }
        })
        .state('tokenlist', {
            url: "/token",
            templateUrl: "views/tokenlist.html",
            data: {pageTitle: 'Tokens'},
            controller: "TokenListController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                             '/js/controllers/TokenListController.js'
                        ]
                    });
                }]
            }
        })
        .state('token', {
            url: "/token/{hash}",
            templateUrl: "views/token.html",
            data: {pageTitle: 'Tokens'},
            controller: "TokenController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                             '/js/controllers/TokenController.js'
                        ]
                    });
                }]
            }
        })
        .state('dao', {
            url: "/dao",
            templateUrl: "views/dao.html",
            data: {pageTitle: 'theDAO'},
            controller: "DAOController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                             '/js/controllers/DAOController.js'
                        ]
                    });
                }]
            }
        })
        .state('err404', {
            url: "/err404/{thing}/{hash}",
            templateUrl: "views/err_404.html",
            data: {pageTitle: '404 Not Found.'},
            controller: "ErrController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                             '/js/controllers/ErrController.js'
                        ]
                    });
                }]
            }
        })
}]);
BlocksApp.filter('timeDuration', function() {
  return function(timestamp) {
    return getDuration(timestamp).toString();
  };
})
.filter('totalDifficulty', function() {
  return function(hashes) {
    return getDifficulty(hashes);
  };
}) 
.filter('teraHashes', function() {
    return function(hashes) {
        var result = hashes / Math.pow(1000, 4);
        return parseInt(result);
  }
})
/* Init global settings and run the app */
BlocksApp.run(["$rootScope", "settings", "$state", "setupObj", function($rootScope, settings, $state, setupObj) {
    $rootScope.$state = $state; // state to be accessed from view
    $rootScope.$settings = settings; // state to be accessed from view
    setupObj.then(function(res) {
        $rootScope.setup = res;
    });
}]);

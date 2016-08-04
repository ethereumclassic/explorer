var BlocksApp = angular.module("BlocksApp", [
    "ui.router", 
    "ui.bootstrap", 
    "oc.lazyLoad",  
    "ngSanitize"
]); 

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
BlocksApp.controller('HeaderController', ['$scope', function($scope) {
    $scope.$on('$includeContentLoaded', function() {
        Layout.initHeader(); // init header
    });
}]);

/* Setup Layout Part - Sidebar */
BlocksApp.controller('SidebarController', ['$scope', '$rootScope', '$location', '$anchorScroll', 
    function($scope, $rootScope, $location, $anchorScroll) {
    $scope.$on('$includeContentLoaded', function() {
        Layout.initSidebar(); // init sidebar
        this.charts = $rootScope.charts;
    });
}]);

BlocksApp.controller('PageHeadController', ['$scope', function($scope) {
    $scope.$on('$includeContentLoaded', function() {        
        //Demo.init(); // init theme panel
    });
}]);

BlocksApp.controller('ThemePanelController', ['$scope', function($scope) {
    $scope.$on('$includeContentLoaded', function() {
        Settings.init();
    });
}]);

/* Setup Layout Part - Footer */
BlocksApp.controller('FooterController', ['$scope', function($scope) {
    $scope.$on('$includeContentLoaded', function() {
        Layout.initFooter(); // init footer
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
            controller: "BlocksController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load([{
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                            '/js/controllers/BlocksController.js'
                        ]}]);
                }]
            }
        })

        // Transactions
        .state('transactions', {
            url: "/transactions",
            templateUrl: "views/transactions.html",            
            data: {pageTitle: 'Transactions and Stuff'},
            controller: "TransactionsController",
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load([{
                        name: 'BlocksApp',
                        insertBefore: '#ng_load_plugins_before', 
                        files: [
                            '/css/charts_light.css',
                            '/js/controllers/TransactionsController.js'
                        ]}]);
                }]
            }
        })
}]);

/* Init global settings and run the app */
BlocksApp.run(["$rootScope", "settings", "$state", function($rootScope, settings, $state) {
    $rootScope.$state = $state; // state to be accessed from view
    $rootScope.$settings = settings; // state to be accessed from view
}]);
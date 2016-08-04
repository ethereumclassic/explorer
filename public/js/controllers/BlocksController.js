angular.module('BlocksApp').controller('BlocksController', function($rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $scope.charts = $rootScope.charts;

    // set sidebar closed and body solid layout mode
    $rootScope.settings.layout.pageContentWhite = true;
    $rootScope.settings.layout.pageBodySolid = false;
    $rootScope.settings.layout.pageSidebarClosed = false;

    var URL = '/data';

    $http({
      method: 'POST',
      url: URL,
      data: {"action": "FEES"}
    }).success(function(data) {
      $scope.fees = data;
    });

    $http({
      method: 'POST',
      url: URL,
      data: {"action": "FIX_EVENTS"}
    }).success(function(data) {
      $scope.fixes = data;
    });



})
.directive('feeFactory', function() {
  return {
    restrict: 'E',
    templateUrl: '/views/fees.html'
  }
})
.directive('chartFactory', function() {
  return {
    restrict: 'E',
    templateUrl: '/views/chart.html',
    scope: {
            c: '='
        },
    link: function(scope, elem, attrs){

        var cWidth = 960;
        //elem.parent()[0].offsetWidth - 320;  // fixed sidebar is constant

        var URL = '/data';
        
        var svg = elem.find('chart')[0];
        var name = scope.c.name;
        
        var dataOptions = scope.c.dataOptions;
        var multi = false; // this is a different chart type for now 
        if ('options' in scope.c) 
            multi = scope.c.options.multi;

        var chartOptions = scope.c.options;
        chartOptions['width'] = cWidth;
        

    }
  }
})
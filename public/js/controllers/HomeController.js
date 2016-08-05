angular.module('BlocksApp').controller('HomeController', function($rootScope, $scope, $http, $timeout) {
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
      data: {"action": "latest_blocks"}
    }).success(function(data) {
      $scope.latest_blocks = data.blocks;
    });

    $http({
      method: 'POST',
      url: URL,
      data: {"action": "latest_txs"}
    }).success(function(data) {
      $scope.latest_txs = data.txs;
    });



})
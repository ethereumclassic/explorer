angular.module('BlocksApp').controller('HomeController', function($rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

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

angular.module('BlocksApp').filter('timeDuration', function() {
  return function(timestamp) {
    return getDuration(timestamp).toString();
  };
});
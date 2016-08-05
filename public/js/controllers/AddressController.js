angular.module('BlocksApp').controller('AddressController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;

    var URL = '/addr';

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
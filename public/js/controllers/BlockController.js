angular.module('BlocksApp').controller('BlockController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
        //TableAjax.init();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.number;
    $scope.blockNum = $stateParams.number;

    //fetch transactions
    $http({
      method: 'POST',
      url: '/block',
      data: {"block": $scope.blockNum}
    }).success(function(data) {
      $scope.block = data;
      $scope.block.transactions = data.transactions.length;
      delete $scope.block.logsBloom;
      delete $scope.block._id;
    });


})
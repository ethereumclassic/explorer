angular.module('BlocksApp').controller('BlockController', function($stateParams, $rootScope, $scope, $http, $location) {
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
      if (data.error)
        $location.path("/err404/block/" + $scope.blockNum);
      else {
        $scope.block = data;
        $scope.block.transactions = data.transactions.length;
        delete $scope.block.logsBloom;
        delete $scope.block._id;
      }
    });


})
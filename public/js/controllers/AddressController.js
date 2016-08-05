angular.module('BlocksApp').controller('AddressController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
        TableAjax.init();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $rootScope.addrHash = $stateParams.hash;

    var URL = '/addr';

    $http({
      method: 'POST',
      url: URL,
      data: {"addr": $scope.addrHash}
    }).success(function(data) {
      //$scope.transactions = data;
      console.log(data)
      TableAjax.handleRecords(data);
    });


})
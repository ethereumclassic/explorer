angular.module('BlocksApp').controller('DAOController', function($stateParams, $rootScope, $scope, $http, $timeout) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $scope.dao = {"balance": 0, "extraBalance": 0};

    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/daorelay',
      data: {"action": "info"}
    }).success(function(data) {
      console.log(data)
      $scope.dao = data;
    });


})
angular.module('BlocksApp').controller('TokenListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $http.get('/tokens.json')
      .then(function(res){
        $scope.tokens = res.data;
      })

})
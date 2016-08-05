angular.module('BlocksApp').controller('ErrController', function($stateParams, $rootScope, $scope) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash;
    $scope.thing = $stateParams.thing;

})
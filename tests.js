var player = {
    username: "josh1",
    points: 14,
    isDrawing: false,
    isCorrect: false,
};

var users = [{
    username: "josh1",
    points: 14,
    isDrawing: false,
    isCorrect: false,
}];


function playerStatus(player){
    let index = users.map(function(p){return p.username;}).indexOf(player)
    return users[index];
    //return users[player];
}
function playerID(username){
    let index = users.map(function(p){return p.id;}).indexOf(username)
    return users[index];
}

console.log(plyaerStatus())

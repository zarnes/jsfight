function Fight() {
    this.CreateFight = function(newfight) {
        var fight = {
            leftPlayer: newfight.asker,
            rightPlayer: newfight.target,
            fightId: newfight.fightId,
            timeStamp: newfight.timeStamp,
        };
        return fight;
    }
}
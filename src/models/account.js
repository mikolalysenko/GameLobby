function Account(params) {
  this._id              = params._id         || null;
  this.created_at       = params.created_at  || new Date();
  this.logged_in        = params.logged_in   || false;
  this.last_login       = params.last_login  || new Date();
  this.temporary        = params.temporary   || false;
  this.player_name      = params.player_name || 'Anonymous';
  this.can_change_name  = 'can_change_name' in params ?
                              params.can_change_name : true;
  this.last_ip_address  = params.last_ip_address || "66.66.66.66";
}

exports.Account = Account;
pragma solidity >=0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title MciCoin contract 
 */
contract MciCoin is ERC20Capped, ERC20Detailed {
    uint noOfTokens = 3300000000; // 3,300,000,000(3.3B)

    // Address of mci coin vault 
    // The vault will have all the mci coin issued and the operation
    // on its token can be protected by offline account or multisig
    // In addtion, vault can recall(transfer back) the reserved amount
    // from some address.
    address internal vault;

    // Address of mci coin owner 
    // The owner can change admin and vault address, but the change operation
    // on its token can be protected by offline account or multisig
    address internal owner;

    // Address of mci coin admin 
    // The admin can change reserve. The reserve is the amount of token
    // assigned to some address but not permitted to use.
    // Once the signers of the admin agree with removing the reserve,
    // they can change the reserve to zero to permit the user to use all reserved
    // amount. So in effect, reservation will postpone the use of some tokens
    // being used until all stakeholders agree with giving permission to use that
    // token to the token owner.
    address internal admin;

    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event VaultChanged(address indexed previousVault, address indexed newVault);
    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event ReserveChanged(address indexed _address, uint amount);
    event Recalled(address indexed from, uint amount);

    /**
     * @dev reserved number of tokens per each address
     *
     * To limit token transaction for some period by the admin,
     * each address' balance cannot become lower than this amount
     *
     */
    mapping(address => uint) public reserves;

    /**
       * @dev modifier to limit access to the owner only
       */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /**
       * @dev limit access to the vault only
       */
    modifier onlyVault() {
        require(msg.sender == vault);
        _;
    }

    /**
       * @dev limit access to the admin only
       */
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    /**
       * @dev limit access to owner or vault
       */
    modifier onlyOwnerOrVault() {
        require(msg.sender == owner || msg.sender == vault);
        _;
    }

    /**
     * @dev initialize QRC20(ERC20)
     *
     * all token will deposit into the vault
     *
     * @param _symbol token symbol
     * @param _name   token name
     * @param _owner  owner address
     * @param _admin  admin address
     * @param _vault  vault address
     *
     * Cap the mintable amount to 88.8B(88,800,000,000)
     *
     */
    constructor (string memory _symbol, string memory _name, address _owner,
        address _admin, address _vault) ERC20Detailed(_name, _symbol, 9) ERC20Capped(88800000000000000000)
    public {
        require(bytes(_symbol).length > 0);
        require(bytes(_name).length > 0);

        owner = _owner;
        admin = _admin;
        vault = _vault;

        // mint coins to the vault
        _mint(vault, noOfTokens * (10 ** uint(decimals())));
    }

    /**
     * @dev change the amount of reserved token
     *    reserve should be less than or equal to the current token balance
     *
     *    Refer to the comment on the admin if you want to know more.
     *
     * @param _address the target address whose token will be frozen for future use
     * @param _reserve  the amount of reserved token
     *
     */
    function setReserve(address _address, uint _reserve) public onlyAdmin {
        require(_reserve <= totalSupply());
        require(_address != address(0));

        reserves[_address] = _reserve;
        emit ReserveChanged(_address, _reserve);
    }

    /**
     * @dev transfer token from sender to other
     *         the result balance should be greater than or equal to the reserved token amount
     */
    function transfer(address _to, uint256 _value) public returns (bool) {
        // check the reserve
        require(balanceOf(msg.sender).sub(_value) >= reserveOf(msg.sender));
        return super.transfer(_to, _value);
    }

    /**
     * @dev change vault address
     *    BEWARE! this withdraw all token from old vault and store it to the new vault
     *            and new vault's allowed, reserve will be set to zero
     * @param _newVault new vault address
     */
    function setVault(address _newVault) public onlyOwner {
        require(_newVault != address(0));
        require(_newVault != vault);

        address _oldVault = vault;

        // change vault address
        vault = _newVault;
        emit VaultChanged(_oldVault, _newVault);

        // adjust balance
        uint _value = balanceOf(_oldVault);
        _transfer(_oldVault, _newVault, _value);
    }

    /**
     * @dev change owner address
     * @param _newOwner new owner address
     */
    function setOwner(address _newOwner) public onlyVault {
        require(_newOwner != address(0));
        require(_newOwner != owner);

        emit OwnerChanged(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @dev change admin address
     * @param _newAdmin new admin address
     */
    function setAdmin(address _newAdmin) public onlyOwnerOrVault {
        require(_newAdmin != address(0));
        require(_newAdmin != admin);

        emit AdminChanged(admin, _newAdmin);
        admin = _newAdmin;
    }

    /**
     * @dev transfer a part of reserved amount to the vault
     *
     *    Refer to the comment on the vault if you want to know more.
     *
     * @param _from the address from which the reserved token will be taken
     * @param _amount the amount of token to be taken
     */
    function recall(address _from, uint _amount) public onlyAdmin {
        require(_from != address(0));
        require(_amount > 0);

        uint currentReserve = reserveOf(_from);
        uint currentBalance = balanceOf(_from);

        require(currentReserve >= _amount);
        require(currentBalance >= _amount);

        uint newReserve = currentReserve.sub(_amount);
        reserves[_from] = newReserve;
        emit ReserveChanged(_from, newReserve);

        // transfer token _from to vault
        _transfer(_from, vault, _amount);
        emit Recalled(_from, _amount);
    }

    /**
     * @dev Transfer tokens from one address to another
     *
     * The _from's mci balance should be larger than the reserved amount(reserves[_from]) plus _value.
     *
     *   NOTE: no one can tranfer from vault
     *
     */
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(_from != vault);
        require(_value <= balanceOf(_from).sub(reserves[_from]));
        return super.transferFrom(_from, _to, _value);
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function getVault() public view returns (address) {
        return vault;
    }

    function getAdmin() public view returns (address) {
        return admin;
    }

    function getOneMciCoin() public view returns (uint) {
        return (10 ** uint(decimals()));
    }

    /**
     * @dev get the amount of reserved token
     */
    function reserveOf(address _address) public view returns (uint _reserve) {
        return reserves[_address];
    }

    /**
     * @dev get the amount reserved token of the sender
     */
    function reserve() public view returns (uint _reserve) {
        return reserves[msg.sender];
    }
}

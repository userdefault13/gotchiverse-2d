/* eslint-disable @typescript-eslint/no-var-requires */
import { BigNumber, ethers, Signer } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

export const DEFAULT_GAS_PRICE = '32';

export function isCorrectNetwork(currentNetwork) {
  return currentNetwork === process.env.REALM_NETWORK;
}

export function isKovanOrMainnet(currentNetwork) {
  if ((process.env.APP_ENV === 'development' || process.env.APP_ENV === 'staging') && currentNetwork === 'kovan') return true;
  else if (process.env.APP_ENV === 'production' && currentNetwork === 'main') return true;
  else if (process.env.APP_ENV === 'production' && currentNetwork === 'kovan') return false;
  return false;
}

// Some pages can only be accessed on Ethereum Mainnet
// Some pages can only be accessed on Kovan Testnet
// Some pages can only be accessed on Rinkeby Testnet
// Some pages can only be accessed on Mumbai Testnet
// Some pages can only be accessed on Matic

export function mumbaiOrKovan(currentNetwork) {
  if ((process.env.APP_ENV === 'development' || process.env.APP_ENV === 'staging') && (currentNetwork === 'kovan' || currentNetwork === 'mumbai')) {
    return true;
  }
  return false;
}

// export function isCorrectNetwork(currentNetwork) {
//     if ((process.env.APP_ENV === "development" || process.env.APP_ENV === "staging") && (currentNetwork === "kovan" || currentNetwork === "mumbai"))
//         return true;
//     else if (process.env.APP_ENV === "production" && currentNetwork === "matic") return true;
//     return false;
// }

export function mumbaiKovanOrMatic(currentNetwork) {
  if ((process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'staging') && (currentNetwork === 'kovan' || currentNetwork === 'mumbai')) {
    return true;
  } else if (process.env.ENVIRONMENT === 'prod' && currentNetwork === 'matic') return true;
  return false;
}

export function mumbaiOnly(currentNetwork) {
  if ((process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'staging') && currentNetwork === 'mumbai') return true;
  if (process.env.ENVIRONMENT === 'prod' && currentNetwork === 'mumbai') return true;
  return false;
}

export function mumbaiOrMatic(currentNetwork) {
  if ((process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'staging') && currentNetwork === 'mumbai') return true;
  if (process.env.ENVIRONMENT === 'prod' && currentNetwork === 'matic') return true;
  return false;
}

export function kovanTestnetOnly(currentNetwork) {
  if ((process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'staging') && currentNetwork === 'kovan') return true;
  return false;
}

export function goerliOrEthereumOnly(currentNetwork) {
  if ((process.env.ENVIRONMENT === 'dev' || process.env.ENVIRONMENT === 'staging') && currentNetwork === 'goerli') return true;
  if (process.env.ENVIRONMENT === 'prod' && currentNetwork === 'main') return true;
  return false;
}

export function isMainnet(currentNetwork) {
  return currentNetwork === 'main';
}

export function wrongNetworkError(currentNetwork) {
  if (!currentNetwork) return 'Please connect your wallet.';
  if (process.env.ENVIRONMENT === 'prod' && currentNetwork === 'kovan') return 'Please connect to Mainnet!';
  else if (process.env.ENVIRONMENT === 'dev' && currentNetwork === 'main') return 'Please connect to Kovan Testnet!';
  else if (process.env.ENVIRONMENT === 'staging' && currentNetwork === 'main') return 'Please connect to Kovan Testnet!';
  return false;
}

export function wrongExpectedNetworkError(currentNetwork, expectedTestnet) {
  if (!currentNetwork) return 'Please connect your wallet.';
  if (process.env.ENVIRONMENT === 'prod' && currentNetwork !== 'main') return 'Please connect to Ethereum Mainnet!!';
  else if (process.env.ENVIRONMENT === 'dev' && currentNetwork !== expectedTestnet) {
    return `Please connect to ${expectedTestnet.toUpperCase()} Testnet!`;
  } else if (process.env.ENVIRONMENT === 'staging' && currentNetwork !== expectedTestnet.toUpperCase()) {
    return `Please connect to ${expectedTestnet} Testnet!`;
  }
  return false;
}

export function wrongExpectedNetworkMatic(currentNetwork) {
  if (!currentNetwork) return 'Please connect your wallet.';
  const expected = process.env.REALM_NETWORK || process.env.NETWORK || 'base';
  if (expected === 'base' && currentNetwork !== 'base') return 'Please connect to Base Network!';
  if (process.env.ENVIRONMENT === 'prod' && currentNetwork !== 'matic' && expected !== 'base') return 'Please connect to Polygon Network!';
  else if (process.env.ENVIRONMENT === 'dev' && currentNetwork !== 'mumbai') return 'Please connect to Mumbai Testnet!';
  else if (process.env.ENVIRONMENT === 'staging' && currentNetwork !== 'mumbai'.toUpperCase()) return 'Please connect to Mumbai Testnet!';
  return false;
}

export async function onSubmitWithEIP712Sign(
  globalEthers,
  currentNetwork: string,
  currentAccount: string,
  metaTransactionContract: ethers.Contract,
  FunctionContractABI: any,
  functionName: string,
  params: any[],
  contractName: string,
  version: string,
  contractAddress: string,
  chainId: number,
  useSalt?: boolean,
) {
  const metaTransactionType = [
    { name: 'nonce', type: 'uint256' },
    { name: 'from', type: 'address' },
    { name: 'functionSignature', type: 'bytes' },
  ];

  let domainData;
  let domainType;

  if (useSalt) {
    domainType = [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'verifyingContract', type: 'address' },
      { name: 'salt', type: 'bytes32' },
    ];

    // console.log("salt:", salt);
    domainData = {
      name: contractName,
      version: version,
      verifyingContract: contractAddress,
      salt: '0x' + chainId.toString(16).padStart(64, '0'), // should be formatted
    };
  } else {
    domainType = [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'salt', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ];

    // console.log("salt:", salt);
    domainData = {
      name: contractName,
      version: version,
      verifyingContract: contractAddress,
      salt: chainId.toString(), // just normal
    };
  }

  console.log('domain type:', domainType);
  console.log('domain data:', domainData);

  console.log('contract:', metaTransactionContract);

  const userAddress = currentAccount;
  const nonce = await metaTransactionContract.getNonce(userAddress);
  console.log('nonce:', nonce);
  const iface = new ethers.utils.Interface(FunctionContractABI);
  console.log('params:', params);

  let functionSignature;

  if (params.length > 0) functionSignature = iface.encodeFunctionData(functionName, params);
  else functionSignature = iface.encodeFunctionData(functionName);

  console.log('function sig:', functionSignature);

  const message = {
    nonce: parseInt(nonce),
    from: userAddress,
    functionSignature: functionSignature,
  };

  const dataToSign = JSON.stringify({
    types: {
      EIP712Domain: domainType,
      MetaTransaction: metaTransactionType,
    },
    domain: domainData,
    primaryType: 'MetaTransaction',
    message: message,
  });

  console.log('ethers:', globalEthers);

  const signature = await globalEthers.send('eth_signTypedData_v4', [userAddress, dataToSign]);
  // console.log('signature:', signature);
  const { r, s, v } = getSignatureParameters(signature);

  return { r: r, s: s, v: v, functionSignature: functionSignature };
}

const getSignatureParameters = (signature) => {
  if (!ethers.utils.isHexString(signature)) {
    throw new Error('Given value "'.concat(signature, '" is not a valid hex string.'));
  }
  const r = signature.slice(0, 66);
  const s = '0x'.concat(signature.slice(66, 130));
  let v = '0x'.concat(signature.slice(130, 132));
  v = ethers.BigNumber.from(v).toString();
  if (!['27', '28'].includes(v)) v += 27;
  return {
    r: r,
    s: s,
    v: v,
  };
};

export const localStorageLoaded = () => typeof localStorage !== 'undefined' && localStorage !== undefined;

export const gasPriceDict = async (ethersSigner: Signer): Promise<{ gasPrice: ethers.BigNumber }> => {
  // console.log(await ethersSigner.provider.getBlock('latest'));

  const feeData = await ethersSigner.provider.getFeeData();

  if (feeData.maxFeePerGas) {
    return {
      gasPrice: feeData.gasPrice.mul(5).div(2),
    };
  } else {
    return { gasPrice: parseUnits(DEFAULT_GAS_PRICE, 'gwei') };
  }
};

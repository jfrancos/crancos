import React, { useState } from 'react';
import { Suoli } from '@jfrancos/suoli';
import { FaUserCircle } from 'react-icons/fa';
import { useOutsideClickRef } from 'rooks';
import { CgSpinner } from 'react-icons/cg';
import { magic, RPCError } from './lib/magic.js';
import { getDatabase } from './lib/Collection';
import { useUser } from './lib/ReplicatedCollection';

const Auth = () => {
  const [loginError, setLoginError] = useState(null);
  const [user, setUser] = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [menuRef] = useOutsideClickRef(() => setShowMenu(false));
  const [upgradeState, setUpgradeState] = useState(0);

  const handleEmail = async (email) => {
    setLoginError(null);
    try {
      await magic.auth.loginWithMagicLink({ email });
      await updateUser();
    } catch (err) {
      if (err instanceof RPCError) {
        setLoginError(err.rawMessage);
      } else {
        console.log('Unknown error');
        throw err;
      }
    }
  };

  const handleSignOut = async () => {
    await magic.user.logout();
    await (await getDatabase()).remove();
    // we should also `Logout(false)` current Fauna token
    location.reload();
  };

  const handleUpgrade = async () => {
    if (upgradeState !== 0) {
      return;
    }
    setUpgradeState(1);
    const token = await magic.user.getIdToken({ lifespan: 15 });
    const response = await fetch('/api/stripe-session', {
      method: 'post',
      body: JSON.stringify(token),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { url } = await response.json();
    window.location.href = url;
    setUpgradeState(2);
  };

  const toggleMenu = () => {
    setShowMenu((showMenu) => !showMenu);
  };

  const updateUser = async () => {
    try {
      const { email } = await magic.user.getMetadata();
      if (email !== user?.email) {
        setUser({ email });
      }
    } catch {
      console.log('no metadata');
      // console.log('Auth: setting user to null');
      // setUser(null);
    }
  };

  return (
    <>
      {user ? (
        <div
          ref={menuRef}
          className="top-0 right-0 mr-16 mt-6 fixed flex-col items-end cursor-default"
        >
          <div className="gap-x-10 items-center ">
            {user.plan === 'free' && (
              <div className="group -m-2 p-2" onClick={handleUpgrade}>
                <div className="group-hover:bg-gray-700 font-medium uppercase text-sm py-3 px-9 bg-gray-500 text-gray-100 rounded-md">
                  {upgradeState === 0 && 'upgrade'}
                  {upgradeState === 1 && (
                    <div className="gap-x-3 items-center">
                      authorizing
                      <CgSpinner className="animate-spin h-5 w-5" />
                    </div>
                  )}
                  {upgradeState === 2 && (
                    <div className="gap-x-3 items-center">
                      connecting to stripe
                      <CgSpinner className="animate-spin h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div
              onClick={toggleMenu}
              className="-m-4 p-4 .mb-0.5 text-gray-500 hover:text-gray-900"
            >
              <FaUserCircle className="w-6 h-6" />
            </div>
          </div>
          {showMenu && (
            <div className="flex-col items-end gap-y-4 mt-5">
              <div className="text-gray-900">{user.email}</div>
              {user.plan === 'premium' && (
                <div
                  className="cursor-default bg-gray-500 hover:bg-gray-900 text-gray-100 py-1 px-8 rounded-full"
                  onClick={handleUpgrade}
                >
                  {upgradeState === 0 && 'Update plan'}
                  {upgradeState === 1 && (
                    <div className="gap-x-3 items-center">
                      Authorizing
                      <CgSpinner className="animate-spin h-5 w-5" />
                    </div>
                  )}
                  {upgradeState === 2 && (
                    <div className="gap-x-3 items-center">
                      Connecting to stripe
                      <CgSpinner className="animate-spin h-5 w-5" />
                    </div>
                  )}
                </div>
              )}
              <div
                className="cursor-default bg-gray-500 hover:bg-gray-900 text-gray-100 py-1 px-4 rounded-full"
                onClick={handleSignOut}
              >
                Sign out
              </div>
            </div>
          )}
        </div>
      ) : magic ? (
        <Suoli
          error={loginError}
          onEmail={handleEmail}
          className="top-0 right-0 mr-16 mt-8 fixed"
        />
      ) : null}
    </>
  );
};

export { Auth };

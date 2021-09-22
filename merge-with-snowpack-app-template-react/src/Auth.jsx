import React, { useState, useEffect, useRef } from 'react';
import { Suoli } from '@jfrancos/suoli';
import { Magic, RPCError } from 'magic-sdk';
import { FaUserCircle } from 'react-icons/fa';
import { useOutsideClickRef } from 'rooks';

const { MAGIC_PUBLISHABLE_KEY } = import.meta.env;

let magic;

if (MAGIC_PUBLISHABLE_KEY) {
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, { testMode: false });
}

const UserMetadata = React.createContext();

const Auth = ({ children }) => {
  const [loginError, setLoginError] = useState(null);
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuRef] = useOutsideClickRef(() => setShowMenu(false));

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
    await updateUser();
  };

  const toggleMenu = () => {
    setShowMenu((showMenu) => !showMenu);
  };

  const updateUser = async () => {
    try {
      const metadata = await magic.user.getMetadata();
      console.log("Auth: setting user", { metadata });
      setUser(metadata);
    } catch {
      console.log('Auth: setting user to null');
      setUser(null);
    }
  };

  useEffect(async () => {
    await updateUser();
  }, []);

  return (
    <UserMetadata.Provider value={user}>
      {user ? (
        <div
          ref={menuRef}
          className="top-0 right-0 mr-16 mt-8 fixed flex-col items-end"
          onClick={toggleMenu}
        >
          {/* {user.email} */}
          <div className="-m-4 p-4 .mb-0.5 text-gray-500 hover:text-gray-900">
            <FaUserCircle className="w-6 h-6" />
          </div>

          {showMenu && (
            <div className="flex-col items-end">
              <div className="text-gray-900 mt-2">{user.email}</div>
              <div
                className="cursor-default bg-gray-500 hover:bg-gray-900 text-white mt-2 py-1 px-4 rounded-full"
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
      {children}
    </UserMetadata.Provider>
  );
};

export { Auth, UserMetadata };

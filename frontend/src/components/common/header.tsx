'use client';


function Header() {
    return (
        <header className="header-main">
            <div className="container-fluid">
                <div className="row">
                    <div className="col-8 col-sm-6 d-flex align-items-center header-left p-0">
                        <span className="header-toggle ">
                            <i className="ph ph-squares-four"></i>
                        </span>
                    </div>
                    <div className="col-4 col-sm-6 d-flex align-items-center justify-content-end header-right p-0">
                        <ul className="d-flex align-items-center">
                            <li className="header-dark">
                                <div className="sun-logo head-icon bg-light-dark rounded-circle f-s-22 p-2">
                                    <i className="ph ph-moon-stars"></i>
                                </div>
                                <div className="moon-logo head-icon bg-light-dark rounded-circle f-s-22 p-2">
                                    <i className="ph ph-sun"></i>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
